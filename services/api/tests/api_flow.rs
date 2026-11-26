use rust_decimal::Decimal;
use sqlx::postgres::PgPoolOptions;
use unadomot_api::application::auth::{login, register};
use unadomot_api::application::listings::{create_listing, get_listing, update_listing};
use unadomot_api::application::messaging::{
    list_conversations, list_messages, mark_read, send_message, start_conversation,
};
use unadomot_api::domain::listing::{ListingUpdate, NewListing};
use unadomot_api::infrastructure::postgres::{
    listing_repository::PostgresListingRepository,
    messaging_repository::PostgresMessagingRepository,
    user_repository::PostgresUserRepository,
};
use uuid::Uuid;

#[tokio::test]
async fn register_login_create_and_update_listing() {
    let Ok(url) = std::env::var("DATABASE_URL") else {
        return;
    };

    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .expect("database");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("migrations");

    let users = PostgresUserRepository::new(pool.clone());
    let listings = PostgresListingRepository::new(pool);
    let email = format!("test-{}@example.com", Uuid::new_v4());

    let user = register(&users, &email, "password123", "Test User")
        .await
        .expect("register");
    login(&users, &email, "password123", "test-secret-that-is-at-least-32-bytes")
        .await
        .expect("login");

    let listing = create_listing(
        &listings,
        user.id,
        &NewListing {
            landlord_id: user.id,
            title: "Two bedroom flat".into(),
            description: "A test listing".into(),
            price: Decimal::new(800_000, 0),
            address: "Port Harcourt".into(),
            state: "Rivers".into(),
            lga: "Obio/Akpor".into(),
            is_agent_listing: false,
            bedrooms: Some(2),
            bathrooms: Some(2),
            property_type: Some("flat".into()),
            furnishing: Some("unfurnished".into()),
        },
    )
    .await
    .expect("create listing");

    let fetched = get_listing(&listings, listing.id)
        .await
        .expect("get listing")
        .expect("listing exists");
    assert_eq!(fetched.title, "Two bedroom flat");

    let updated = update_listing(
        &listings,
        listing.id,
        user.id,
        &ListingUpdate {
            price: Some(Decimal::new(900_000, 0)),
            ..Default::default()
        },
    )
    .await
    .expect("update listing");
    assert_eq!(updated.price, Decimal::new(900_000, 0));
}

#[tokio::test]
async fn messaging_flow() {
    let Ok(url) = std::env::var("DATABASE_URL") else {
        return;
    };

    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .expect("database");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("migrations");

    let users = PostgresUserRepository::new(pool.clone());
    let listings = PostgresListingRepository::new(pool.clone());
    let messaging = PostgresMessagingRepository::new(pool);

    let landlord = register(
        &users,
        &format!("landlord-{}@example.com", Uuid::new_v4()),
        "password123",
        "Landlord",
    )
    .await
    .expect("register landlord");
    let renter = register(
        &users,
        &format!("renter-{}@example.com", Uuid::new_v4()),
        "password123",
        "Renter",
    )
    .await
    .expect("register renter");

    let listing = create_listing(
        &listings,
        landlord.id,
        &NewListing {
            landlord_id: landlord.id,
            title: "Chat listing".into(),
            description: "A listing for messaging".into(),
            price: Decimal::new(500_000, 0),
            address: "Lekki".into(),
            state: "Lagos".into(),
            lga: "Eti-Osa".into(),
            is_agent_listing: false,
            bedrooms: Some(1),
            bathrooms: Some(1),
            property_type: Some("flat".into()),
            furnishing: Some("furnished".into()),
        },
    )
    .await
    .expect("create listing");

    let conversation = start_conversation(&messaging, listing.id, renter.id)
        .await
        .expect("start conversation");
    let again = start_conversation(&messaging, listing.id, renter.id)
        .await
        .expect("start conversation again");
    assert_eq!(conversation.id, again.id);

    let renter_inbox = list_conversations(&messaging, renter.id)
        .await
        .expect("renter inbox");
    assert_eq!(renter_inbox.len(), 1);
    assert_eq!(renter_inbox[0].counterpart_id, landlord.id);
    assert_eq!(renter_inbox[0].listing_title, "Chat listing");
    assert_eq!(renter_inbox[0].unread_count, 0);

    let message = send_message(&messaging, renter.id, conversation.id, "Hello there")
        .await
        .expect("send message");
    assert_eq!(message.body, "Hello there");

    let landlord_inbox = list_conversations(&messaging, landlord.id)
        .await
        .expect("landlord inbox");
    assert_eq!(landlord_inbox[0].unread_count, 1);

    mark_read(&messaging, landlord.id, conversation.id)
        .await
        .expect("mark read");
    let landlord_inbox = list_conversations(&messaging, landlord.id)
        .await
        .expect("landlord inbox after read");
    assert_eq!(landlord_inbox[0].unread_count, 0);

    let messages = list_messages(&messaging, landlord.id, conversation.id, None, 50)
        .await
        .expect("list messages");
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0].body, "Hello there");

    let outsider = register(
        &users,
        &format!("outsider-{}@example.com", Uuid::new_v4()),
        "password123",
        "Outsider",
    )
    .await
    .expect("register outsider");
    assert!(list_messages(&messaging, outsider.id, conversation.id, None, 50)
        .await
        .is_err());
}
