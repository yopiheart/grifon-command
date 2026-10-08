"""Offline provenance/age regressions. No env, scraper or paid calls."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

REPO = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("--module-path", default=str(REPO / "tools/find_winning_ads.py"))
options, remaining = parser.parse_known_args()
spec = importlib.util.spec_from_file_location("recon", options.module_path)
recon = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recon)


def collection(status="partial"):
    source = recon.build_pinned_url("12345", "ALL", "all", "2026-09-08")
    return {"status": status, "page_id": "12345", "advertiser": "Example Brand",
            "observed_at": "2026-10-08T00:00:00+08:00", "source_url": source,
            "identity_source_url": source, "identity_reviewed": True,
            "identity_evidence": "Operator matched Page identity and official destination.",
            "method": "Manual card sample after refresh.", "limitations": ["Sample only."]}


def ad(**overrides):
    return {"advertiser": "Example Brand", "page_id": "12345", "library_id": "98765",
            "activity": "active", "started_running": "2026-02-17", "primary_text": "Example caption",
            **overrides}


class RankingTests(unittest.TestCase):
    def test_membership_does_not_invent_age_or_validate_bad_ids(self):
        candidates, _ = recon.rank([
            {"advertiser": "Decoy", "library_id": "not-a-numeric-id", "started_running": ""},
            {"advertiser": "Decoy", "library_id": "123", "started_running": "2099-01-01"},
        ], 5, 30, trust_membership=True)
        self.assertEqual(candidates, [])

    def test_blank_young_future_and_bad_dates_stay_excluded_even_with_filter(self):
        inputs = [ad(library_id=str(index), started_running=date)
                  for index, date in enumerate(["", "2026-10-06", "2099-01-01", "not a date"], 1)]
        result, stats = recon.rank(inputs, 5, 30, True, collection())
        self.assertEqual(result, [])
        reasons = [item["reasons"] for item in stats["excluded"]]
        self.assertIn("missing_or_invalid_date", reasons[0])
        self.assertIn("below_min_days", reasons[1])
        self.assertIn("future_start_date", reasons[2])

    def test_partial_records_have_observation_bound_age_and_no_profit_claim(self):
        result, stats = recon.rank([ad()], 5, 30, collection=collection())
        self.assertEqual(result[0]["elapsed_days_since_displayed_start"], 233)
        self.assertEqual(stats["collection"]["status"], "partial")
        self.assertNotIn("days_active", result[0])
        self.assertNotIn("winning_signal", result[0])
        self.assertEqual(recon.rank([ad()], 5, 30, collection=collection())[0], result)

    def test_missing_reviewed_provenance_is_not_ready(self):
        result, stats = recon.rank([ad()], 5, 30)
        self.assertEqual(result, [])
        self.assertIn("collection_not_reviewable", stats["excluded"][0]["reasons"])

    def test_decoy_page_inactive_duplicate_and_permalink_mismatch(self):
        inputs = [ad(library_id="1", advertiser="Decoy"), ad(library_id="2", page_id="54321"),
                  ad(library_id="3", activity="inactive"), ad(library_id="4"), ad(library_id="4"),
                  ad(library_id="5", ad_permalink="https://www.facebook.com/ads/library/?id=99")]
        result, stats = recon.rank(inputs, 10, 30, collection=collection())
        self.assertEqual(result, [])
        self.assertEqual(len(stats["excluded"]), 6)
        self.assertIn("duplicate_library_id", stats["excluded"][3]["reasons"])

    def test_blocked_collection_cannot_be_made_ready_by_injecting_records(self):
        result, stats = recon.rank([ad()], 5, 30, collection=collection("blocked"))
        self.assertEqual(result, [])
        self.assertEqual(stats["collection"]["status"], "blocked")

    def test_invalid_origin_page_or_unrecorded_completeness(self):
        for changes in [{"source_url": "https://facebook.com.attacker.test/ads/library/?view_all_page_id=12345"},
                        {"page_id": "22"}, {"status": "complete"},
                        {"identity_reviewed": False}, {"observed_at": "2026-10-08"},
                        {"observed_at": "2099-01-01T00:00:00Z"}]:
            record = {**collection(), **changes}
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                recon.rank([ad()], 5, 30, collection=record)

    def test_complete_requires_coverage_and_low_badge_is_preserved(self):
        provenance = {**collection("complete"), "completion_evidence": "All cards reviewed until list end."}
        result, stats = recon.rank([ad(), ad(library_id="456", low_impression_badge=True)],
                                  5, 30, collection=provenance)
        self.assertEqual(len(result), 1)
        self.assertIn("low_impression_badge", stats["excluded"][0]["reasons"])

    def test_cli_unknown_empty_is_not_no_ads_and_blocked_is_explicit(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.json"
            for raw, expected_exit, expected_status in [
                ({"ads": []}, 3, "unknown"),
                ({"ads": [ad()], "page_state": "captcha", "collection": collection()}, 2, "blocked"),
                ({"ads": [ad()], "collection": collection()}, 0, "partial"),
            ]:
                path.write_text(json.dumps(raw), encoding="utf-8")
                run = subprocess.run([sys.executable, "-B", options.module_path, "--from-json", str(path),
                                      "--out-dir", directory], capture_output=True, text=True)
                self.assertEqual(run.returncode, expected_exit, run.stderr)
                output = json.loads(run.stdout)
                self.assertEqual(output["status"], expected_status)
                self.assertNotIn("NO WINNERS", run.stderr)
                if expected_status == "blocked":
                    self.assertEqual(output["shortlist"], [])

    def test_cli_validates_bounds_without_network(self):
        for args in [["--page-id", "bad", "--print-url"], ["--page-id", "123", "--top", "0", "--print-url"],
                     ["--page-id", "123", "--started-before", "not-a-date", "--print-url"]]:
            run = subprocess.run([sys.executable, "-B", options.module_path, *args], capture_output=True, text=True)
            self.assertEqual(run.returncode, 1, run.stderr)


if __name__ == "__main__":
    unittest.main(argv=[sys.argv[0], *remaining])
