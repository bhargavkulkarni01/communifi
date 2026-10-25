import os, time
from contextvars import ContextVar
from typing import Literal
import boto3
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()
SECRET, BUCKET = os.environ["JWT_SECRET"], os.environ["S3_BUCKET"]
GIDS = [x.strip().strip('"\'') for x in os.environ["GOOGLE_CLIENT_IDS"].split(",") if x.strip()]
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1"), config=Config(signature_version="s3v4"))
ADMINS = [e.strip() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]
CLIENT = ContextVar("client", default="web")  # "app" or "web", set per request by tag_client in main.py
now = lambda: int(time.time())

Status = Literal["open", "assigned", "in_progress", "resolved"]
Period = Literal["day", "week", "month"]
SPAN = {"day": 86400, "week": 7 * 86400, "month": 30 * 86400}
LABEL = {"open": "Reopened", "assigned": "Assigned", "in_progress": "Work started", "resolved": "Resolved"}
STATUS_NAME = {"open": "Open", "assigned": "Assigned", "in_progress": "In Progress", "resolved": "Resolved"}
DEPT = {"roads": "Public Works - Roads", "streetlights": "Public Works - Electrical", "parks": "Parks & Recreation", "sanitation": "Sanitation", "other": "Triage"}
WEIGHT = {"low": 1, "medium": 2, "high": 4}
URG = {"routine": 1, "soon": 2, "urgent": 3, "emergency": 5}
CAUSE = {"roads": "road-base or drainage failure", "streetlights": "a circuit or transformer fault", "parks": "deferred maintenance or vandalism", "sanitation": "a missed collection route", "other": "a shared underlying cause"}
KW = {"streetlights": ["light", "lamp", "dark"], "sanitation": ["trash", "garbage", "waste", "bin", "dump"], "parks": ["park", "playground", "tree", "bench"], "roads": ["pothole", "road", "sidewalk", "crack", "street", "water", "leak"]}
