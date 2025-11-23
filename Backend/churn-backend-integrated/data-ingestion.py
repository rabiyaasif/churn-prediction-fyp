import requests
import json
from faker import Faker
import random
import uuid
from datetime import datetime, timedelta

# -----------------
# CONFIG
# -----------------
NUM_USERS = 230
NUM_EVENTS = 750
EVENT_TYPES = [
    "add_to_cart",
    "order_created",
    "added_to_wishlist",
    "removed_from_cart",
    "removed_from_wishlist",
    "cart_quantity_updated"
]

API_KEY = "bda972a61031688d0f06ecb0601835fd0315a2fb1de3bbed6fa4e5a8cd0afcfe"  # Replace with your actual API key
USERS_ENDPOINT = "http://localhost:8000/users/"
EVENTS_ENDPOINT = "http://localhost:8000/events/bulk/"

fake = Faker()
headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}


# -----------------
# 1. Generate Users
# -----------------
users = []
for _ in range(NUM_USERS):
    name = fake.name()
    separator = random.choice([".", "", "_"])
    email_username = separator.join(name.lower().split(" "))
    number_suffix = str(random.randint(10, 9999)) if random.random() < 0.7 else ""
    email = f"{email_username}{number_suffix}@gmail.com"
    
    user = {
        "user_id": str(uuid.uuid4()),
        "name": name,
        "email": email,
    }
    response_users = requests.post(USERS_ENDPOINT, headers=headers, json=user)
    print(f"Users POST status: {response_users.status_code}, response: {response_users.text}")
    users.append(user)

with open("products.json", "r") as f:
    products = json.load(f)

# -----------------
# 2. Generate Events (example using previous products list)
# -----------------
# Assume you already have 'products' list from your products generator
events = []
for _ in range(NUM_EVENTS):
    event_type = random.choice(EVENT_TYPES)

    # user_id rules
    if event_type == "order_created" and random.random() < 0.5:
        user_id = None
        email = fake.email()
    else:
        user = random.choice(users)
        user_id = user["user_id"] if random.random() < 0.8 else None  # 80% chance to have user_id
        email = user["email"]

    # product_id rules
    product = random.choice(products)  # products should be generated before this
    if event_type == "order_created":
        product_id = product["product_id"]
        price = product["price"]
    else:
        product_id = None
        price = None

    event = {
        "user_id": user_id,
        "product_id": product_id,
        "email": email,
        "event_type": event_type,
        "session_id": str(uuid.uuid4()) if random.random() < 0.9 else None,
        "quantity": random.randint(1, 5) if event_type in ["add_to_cart", "cart_quantity_updated", "order_created"] else None,
        "price": price,
        "timestamp": (datetime.now() - timedelta(days=random.randint(0, 90))).isoformat(),
        "extra_data": {"note": fake.sentence()} if random.random() < 0.3 else None
    }
    events.append(event)

# -----------------
# 3. Send Data to API
# -----------------
# Users
# response_users = requests.post(USERS_ENDPOINT, headers=headers, json=users)
# print(f"Users POST status: {response_users.status_code}, response: {response_users.text}")

# # Events
response_events = requests.post(EVENTS_ENDPOINT, headers=headers, json=events)
print(f"Events POST status: {response_events.status_code}, response: {response_events.text}")
