#!/usr/bin/env python3
"""Convert a legacy Firestore JSON export into Postgres INSERT statements."""

import json
import sys
import uuid
from pathlib import Path

NAMESPACE = uuid.UUID("6f1d9f5e-3f4a-4f4b-9f0e-2f6b8c1a7d33")


def uid(value: str) -> str:
    return str(uuid.uuid5(NAMESPACE, str(value)))


def q(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "firestore_export.json")
    output = Path(sys.argv[2] if len(sys.argv) > 2 else "legacy-import.sql")
    data = json.loads(source.read_text())
    lines = ["BEGIN;"]

    usernames = set()
    for user in data.get("users", []):
        legacy_id = user.get("id") or user.get("uid")
        if not legacy_id:
            continue
        user_id = uid(legacy_id)
        email = (user.get("email") or "").strip().lower()
        if not email:
            continue
        name = user.get("displayName") or user.get("name") or email.split("@")[0]
        username = (user.get("username") or "").strip().lower()
        if not username:
            base = "".join(c for c in name.lower() if c.isalnum())[:12] or "user"
            username = base
        candidate = username
        suffix = 1
        while candidate in usernames:
            suffix += 1
            candidate = f"{username}{suffix}"
        usernames.add(candidate)
        verified = bool(user.get("verified"))
        lines.append(
            "INSERT INTO users (id, email, auth_provider) VALUES "
            f"({q(user_id)}, {q(email)}, 'legacy') ON CONFLICT DO NOTHING;"
        )
        lines.append(
            "INSERT INTO user_profiles (user_id, name, username, phone, bio, photo_url, user_type, verified) VALUES "
            f"({q(user_id)}, {q(name)}, {q(candidate)}, {q(user.get('phone'))}, {q(user.get('bio'))}, "
            f"{q(user.get('photoURL'))}, {q(user.get('userType') or 'renter')}, {q(verified)}) "
            "ON CONFLICT (user_id) DO NOTHING;"
        )

    for listing in data.get("listings", []):
        legacy_id = listing.get("id")
        owner = listing.get("userId")
        if not legacy_id or not owner:
            continue
        listing_id = uid(legacy_id)
        lines.append(
            "INSERT INTO listings (id, landlord_id, title, description, price, address, state, lga, "
            "is_agent_listing, status, bedrooms, bathrooms, size_sqm, property_type, furnishing, amenities, created_at) VALUES "
            f"({q(listing_id)}, {q(uid(owner))}, {q(listing.get('title'))}, {q(listing.get('description'))}, "
            f"{q(listing.get('price') or 0)}, {q(listing.get('address'))}, {q(listing.get('state'))}, "
            f"{q(listing.get('lga'))}, {q(bool(listing.get('isAgentListing')))}, "
            f"{q(listing.get('status') or 'available')}, {q(listing.get('bedrooms'))}, "
            f"{q(listing.get('bathrooms'))}, {q(listing.get('sizeSqm'))}, "
            f"{q(listing.get('propertyType'))}, {q(listing.get('furnishing'))}, "
            f"{q(json.dumps(listing.get('amenities') or []))}::jsonb, "
            f"{q(listing.get('createdAt'))}::timestamptz) ON CONFLICT DO NOTHING;"
        )
        for index, image in enumerate(listing.get("images") or []):
            url = image if isinstance(image, str) else image.get("url")
            if not url:
                continue
            lines.append(
                "INSERT INTO listing_media (listing_id, cloudinary_public_id, url, position) VALUES "
                f"({q(listing_id)}, {q(url)}, {q(url)}, {index});"
            )

    for favorite in data.get("favorites", []):
        user_id = favorite.get("userId")
        listing_id = favorite.get("listingId")
        if user_id and listing_id:
            lines.append(
                "INSERT INTO favorites (user_id, listing_id) VALUES "
                f"({q(uid(user_id))}, {q(uid(listing_id))}) ON CONFLICT DO NOTHING;"
            )

    for conversation in data.get("conversations", []):
        legacy_id = conversation.get("id")
        listing_id = conversation.get("listingId")
        participants = conversation.get("participants") or []
        if not legacy_id or not listing_id or len(participants) < 2:
            continue
        conversation_id = uid(legacy_id)
        lines.append(
            "INSERT INTO conversations (id, listing_id, last_message, last_message_at) VALUES "
            f"({q(conversation_id)}, {q(uid(listing_id))}, {q(conversation.get('lastMessage'))}, "
            f"{q(conversation.get('lastMessageAt'))}::timestamptz) ON CONFLICT DO NOTHING;"
        )
        for participant in participants:
            lines.append(
                "INSERT INTO conversation_participants (conversation_id, user_id) VALUES "
                f"({q(conversation_id)}, {q(uid(participant))}) ON CONFLICT DO NOTHING;"
            )

    for message in data.get("messages", []):
        legacy_id = message.get("id")
        conversation_id = message.get("conversationId")
        sender_id = message.get("senderId")
        body = (message.get("body") or "").strip()
        if not legacy_id or not conversation_id or not sender_id or not body:
            continue
        lines.append(
            "INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES "
            f"({q(uid(legacy_id))}, {q(uid(conversation_id))}, {q(uid(sender_id))}, "
            f"{q(body)}, {q(message.get('createdAt'))}::timestamptz) ON CONFLICT DO NOTHING;"
        )

    lines.append("COMMIT;")
    output.write_text("\n".join(lines) + "\n")
    print(f"Wrote {len(lines) - 2} statements to {output}")


if __name__ == "__main__":
    main()
