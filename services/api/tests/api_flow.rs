use rust_decimal::Decimal;
use sqlx::postgres::PgPoolOptions;
use unadomot_api::application::auth::{login, register};
use unadomot_api::application::listings::{create_listing, get_listing, update_listing};
use unadomot_api::domain::listing::{ListingUpdate, NewListing};
use unadomot_api::infrastructure::postgres::{
    listing_repository::PostgresListingRepository, user_repository::PostgresUserRepository,
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
