import datetime as dt
import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location("traffic_report",Path(__file__).resolve().parents[1]/"scripts/traffic-report.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class ReportTests(unittest.TestCase):
    def test_queries(self):
        self.assertEqual(len(m.queries(7)),3)
        self.assertIn("blob2 != 'internal'",m.queries(7)["source"])
        for sql in m.queries(30).values():
            self.assertTrue(sql.startswith("SELECT "))
            self.assertIn("SUM(_sample_interval)",sql)
            self.assertIn("INTERVAL '30' DAY",sql)
        for n in (0,31,"7",True):
            with self.assertRaises(ValueError):m.queries(n)
    def test_report(self):
        r={"source":[{"label":"instagram","requests":"3"},{"label":"direct_or_unknown","requests":1}],"page":[{"label":"portal","requests":4}],"subject":[]}
        out=m.report(r,7,dt.datetime(2026,11,25,20,0,tzinfo=m.JST))
        self.assertIn("Instagram: 3件 (75.0%)",out)
        self.assertIn("対象期間の記録なし",out)
        self.assertIn("訪問者数・セッション数・完了率ではありません",out)
    def test_reject_invalid(self):
        for rows in ([{"label":"secret","requests":1}],[{"label":"instagram","requests":-1}],[{"label":"instagram","requests":True}],[{"label":"instagram","requests":1},{"label":"instagram","requests":2}]):
            with self.assertRaises(ValueError):m.validated(rows,m.SOURCES)
if __name__=="__main__":unittest.main()
