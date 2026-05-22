import urllib.request
import urllib.error

for filename in ["static/js/app.js", "static/js/dataManager.js"]:
    try:
        url = f"http://localhost:5000/{filename}"
        print(f"Requesting {url}...")
        response = urllib.request.urlopen(url)
        print("Status:", response.status)
        print("Content-Type:", response.headers.get("Content-Type"))
        print("Content-Length:", len(response.read()))
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code)
    except Exception as ex:
        print("Other Error:", ex)
