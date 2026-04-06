import urllib.request as r
import urllib.error as e
try:
    resp = r.urlopen('http://localhost:8000/api/public/stores/meski_store/reviews/')
    print(resp.read().decode())
except e.HTTPError as err:
    print(f"Error Code: {err.code}")
    print(err.read().decode())
except Exception as ex:
    print(f"Exception: {ex}")
