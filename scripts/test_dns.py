import socket

hosts = [
    "db.negclsyrkflhurfjhtan.supabase.co",
    "negclsyrkflhurfjhtan.supabase.co",
    "db2.negclsyrkflhurfjhtan.supabase.co",
    "supabase.co",
]

for host in hosts:
    try:
        print(f"Testing {host}...", end=" ")
        ip = socket.gethostbyname(host)
        print(f"Resolved to {ip}")
    except Exception as e:
        print(f"Failed: {e}")
