use rust_decimal::Decimal;
use sqlx::postgres::PgPoolOptions;
use unadomot_api::application::auth::register;
use unadomot_api::application::listings::{
    add_listing_media, create_listing, delete_listing, get_listing, update_listing,
};
use unadomot_api::domain::listing::{ListingUpdate, NewListing, NewListingMedia};
use unadomot_api::infrastructure::postgres::{
    listing_repository::PostgresListingRepository, user_repository::PostgresUserRepository,
};
use uuid::Uuid;

async fn setup() -> Option<(PostgresUserRepository, PostgresListingRepository)> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .expect("database");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("migrations");
    Some((
        PostgresUserRepository::new(pool.clone()),
        PostgresListingRepository::new(pool),
    ))
}

fn sample_listing(owner: Uuid) -> NewListing {
    NewListing {
        landlord_id: owner,
        title: "Test flat".into(),
        description: "A test listing".into(),
        price: Decimal::new(500_000, 0),
        address: "Port Harcourt".into(),
        state: "Rivers".into(),
        lga: "Obio/Akpor".into(),
        is_agent_listing: false,
        bedrooms: Some(2),
        bathrooms: Some(1),
        property_type: Some("flat".into()),
        furnishing: Some("unfurnished".into()),
    }
}

#[tokio::test]
async fn ownership_and_soft_delete_are_enforced() {
    let Some((users, listings)) = setup().await else {
        return;
    };

    let owner = register(
        &users,
        &format!("owner-{}@example.com", Uuid::new_v4()),
        "password123",
        "Owner",
    )
    .await
    .expect("register owner");
    let other = register(
        &users,
        &format!("other-{}@example.com", Uuid::new_v4()),
        "password123",
        "Other",
    )
    .await
    .expect("register other");

    let listing = create_listing(&listings, owner.id, &sample_listing(owner.id))
        .await
        .expect("create listing");

    assert!(update_listing(
        &listings,
        listing.id,
        other.id,
        &ListingUpdate {
            title: Some("Hijacked".into()),
            ..Default::default()
        },
    )
    .await
    .is_err());

    assert!(delete_listing(&listings, listing.id, other.id).await.is_err());

    delete_listing(&listings, listing.id, owner.id)
        .await
        .expect("owner delete");
    assert!(get_listing(&listings, listing.id)
        .await
        .expect("get after delete")
        .is_none());
}

#[tokio::test]
async fn media_attachment_is_returned_with_listing() {
    let Some((users, listings)) = setup().await else {
        return;
    };

    let owner = register(
        &users,
        &format!("media-{}@example.com", Uuid::new_v4()),
        "password123",
        "Media Owner",
    )
    .await
    .expect("register owner");

    let listing = create_listing(&listings, owner.id, &sample_listing(owner.id))
        .await
        .expect("create listing");

    add_listing_media(
        &listings,
        listing.id,
        owner.id,
        &NewListingMedia {
            cloudinary_public_id: "unadomot/test".into(),
            url: "https://example.com/photo.jpg".into(),
            alt_text: Some("Front view".into()),
            position: 0,
        },
    )
    .await
    .expect("add media");

    let fetched = get_listing(&listings, listing.id)
        .await
        .expect("get listing")
        .expect("listing exists");
    assert_eq!(fetched.media.len(), 1);
    assert_eq!(fetched.media[0].url, "https://example.com/photo.jpg");
}

#[tokio::test]
async fn invalid_listing_inputs_are_rejected() {
    let Some((users, listings)) = setup().await else {
        return;
    };

    let owner = register(
        &users,
        &format!("invalid-{}@example.com", Uuid::new_v4()),
        "password123",
        "Invalid Owner",
    )
    .await
    .expect("register owner");

    let mut zero_price = sample_listing(owner.id);
    zero_price.price = Decimal::ZERO;
    assert!(create_listing(&listings, owner.id, &zero_price).await.is_err());

    let mut bad_state = sample_listing(owner.id);
    bad_state.state = "Atlantis".into();
    assert!(create_listing(&listings, owner.id, &bad_state).await.is_err());

    let mut empty_lga = sample_listing(owner.id);
    empty_lga.lga = "   ".into();
    assert!(create_listing(&listings, owner.id, &empty_lga).await.is_err());
}
