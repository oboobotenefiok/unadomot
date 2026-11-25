use crate::application::listings::{ListingError, ListingRepository};
use crate::domain::listing::{
    Listing, ListingFilter, ListingMedia, ListingStatus, ListingUpdate, NewListing,
    NewListingMedia,
};
use sqlx::PgPool;
use uuid::Uuid;

pub struct PostgresListingRepository {
    pool: PgPool,
}

impl PostgresListingRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl ListingRepository for PostgresListingRepository {
    fn browse(&self, filter: &ListingFilter) -> Result<Vec<Listing>, ListingError> {
        let rows = sqlx::query_as::<_, ListingRow>(
            "SELECT id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing FROM listings WHERE deleted_at IS NULL AND status = 'available' AND ($1::text IS NULL OR state = $1) AND ($2::text IS NULL OR lga = $2) AND ($3::text IS NULL OR property_type = $3) AND ($4::numeric IS NULL OR price >= $4) AND ($5::numeric IS NULL OR price <= $5) AND ($6::integer IS NULL OR bedrooms >= $6) AND ($7::text IS NULL OR furnishing = $7) ORDER BY created_at DESC LIMIT 50",
        )
        .bind(filter.state.as_deref())
        .bind(filter.lga.as_deref())
        .bind(filter.property_type.as_deref())
        .bind(filter.min_price)
        .bind(filter.max_price)
        .bind(filter.bedrooms)
        .bind(filter.furnishing.as_deref())
        .fetch_all(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let mut listing: Listing = row.into();
                listing.media = Vec::new();
                listing
            })
            .collect())
    }

    fn get(&self, id: Uuid) -> Result<Option<Listing>, ListingError> {
        let row = sqlx::query_as::<_, ListingRow>(
            "SELECT id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing FROM listings WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        let Some(row) = row else {
            return Ok(None);
        };

        let mut listing: Listing = row.into();
        listing.media = self.load_media(id)?;
        Ok(Some(listing))
    }

    fn create(&self, input: &NewListing) -> Result<Listing, ListingError> {
        let row = sqlx::query_as::<_, ListingRow>(
            "INSERT INTO listings (landlord_id, title, description, price, address, state, lga, is_agent_listing, bedrooms, bathrooms, property_type, furnishing) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing",
        )
        .bind(input.landlord_id)
        .bind(input.title.trim())
        .bind(input.description.trim())
        .bind(decimal_price(input.price))
        .bind(input.address.trim())
        .bind(input.state.trim())
        .bind(input.lga.trim())
        .bind(input.is_agent_listing)
        .bind(input.bedrooms)
        .bind(input.bathrooms)
        .bind(input.property_type.as_deref())
        .bind(input.furnishing.as_deref())
        .fetch_one(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        let mut listing: Listing = row.into();
        listing.media = Vec::new();
        Ok(listing)
    }

    fn update(
        &self,
        id: Uuid,
        owner_id: Uuid,
        update: &ListingUpdate,
    ) -> Result<Listing, ListingError> {
        let row = sqlx::query_as::<_, ListingRow>(
            "UPDATE listings SET title = COALESCE($3, title), description = COALESCE($4, description), price = COALESCE($5, price), address = COALESCE($6, address), state = COALESCE($7, state), lga = COALESCE($8, lga), is_agent_listing = COALESCE($9, is_agent_listing), status = COALESCE($10, status), bedrooms = COALESCE($11, bedrooms), bathrooms = COALESCE($12, bathrooms), property_type = COALESCE($13, property_type), furnishing = COALESCE($14, furnishing), updated_at = now() WHERE id = $1 AND landlord_id = $2 AND deleted_at IS NULL RETURNING id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing",
        )
        .bind(id)
        .bind(owner_id)
        .bind(update.title.as_deref())
        .bind(update.description.as_deref())
        .bind(update.price.map(decimal_price))
        .bind(update.address.as_deref())
        .bind(update.state.as_deref())
        .bind(update.lga.as_deref())
        .bind(update.is_agent_listing)
        .bind(update.status.map(|status| status.as_str().to_string()))
        .bind(update.bedrooms.unwrap_or(None))
        .bind(update.bathrooms.unwrap_or(None))
        .bind(update.property_type.clone().unwrap_or(None))
        .bind(update.furnishing.clone().unwrap_or(None))
        .fetch_optional(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        row.map(ListingRow::into)
            .ok_or(ListingError::Forbidden)
    }

    fn delete(&self, id: Uuid, owner_id: Uuid) -> Result<(), ListingError> {
        let result = sqlx::query(
            "UPDATE listings SET deleted_at = now(), updated_at = now() WHERE id = $1 AND landlord_id = $2 AND deleted_at IS NULL",
        )
        .bind(id)
        .bind(owner_id)
        .execute(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(ListingError::Forbidden);
        }
        Ok(())
    }

    fn add_media(
        &self,
        listing_id: Uuid,
        owner_id: Uuid,
        media: &NewListingMedia,
    ) -> Result<ListingMedia, ListingError> {
        let owned = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM listings WHERE id = $1 AND landlord_id = $2 AND deleted_at IS NULL",
        )
        .bind(listing_id)
        .bind(owner_id)
        .fetch_optional(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        if owned.is_none() {
            return Err(ListingError::Forbidden);
        }

        let row = sqlx::query_as::<_, MediaRow>(
            "INSERT INTO listing_media (listing_id, cloudinary_public_id, url, alt_text, position) VALUES ($1, $2, $3, $4, $5) RETURNING id, cloudinary_public_id, url, alt_text, position",
        )
        .bind(listing_id)
        .bind(media.cloudinary_public_id.trim())
        .bind(media.url.trim())
        .bind(media.alt_text.as_deref())
        .bind(media.position)
        .fetch_one(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        Ok(row.into())
    }
}

impl PostgresListingRepository {
    fn load_media(&self, listing_id: Uuid) -> Result<Vec<ListingMedia>, ListingError> {
        let rows = sqlx::query_as::<_, MediaRow>(
            "SELECT id, cloudinary_public_id, url, alt_text, position FROM listing_media WHERE listing_id = $1 ORDER BY position ASC, created_at ASC",
        )
        .bind(listing_id)
        .fetch_all(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(MediaRow::into).collect())
    }
}

fn decimal_price(price: f64) -> rust_decimal::Decimal {
    rust_decimal::Decimal::from_f64_retain(price).unwrap_or_default()
}

#[derive(sqlx::FromRow)]
struct ListingRow {
    id: Uuid,
    landlord_id: Uuid,
    title: String,
    description: String,
    price: rust_decimal::Decimal,
    address: String,
    state: String,
    lga: String,
    is_agent_listing: bool,
    status: String,
    bedrooms: Option<i32>,
    bathrooms: Option<i32>,
    property_type: Option<String>,
    furnishing: Option<String>,
}

impl From<ListingRow> for Listing {
    fn from(row: ListingRow) -> Self {
        Self {
            id: row.id,
            landlord_id: row.landlord_id,
            title: row.title,
            description: row.description,
            price: row.price.to_string().parse().unwrap_or_default(),
            address: row.address,
            state: row.state,
            lga: row.lga,
            is_agent_listing: row.is_agent_listing,
            status: match row.status.as_str() {
                "rented" => ListingStatus::Rented,
                "removed_by_admin" => ListingStatus::RemovedByAdmin,
                _ => ListingStatus::Available,
            },
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            property_type: row.property_type,
            furnishing: row.furnishing,
            media: Vec::new(),
        }
    }
}

#[derive(sqlx::FromRow)]
struct MediaRow {
    id: Uuid,
    cloudinary_public_id: String,
    url: String,
    alt_text: Option<String>,
    position: i32,
}

impl From<MediaRow> for ListingMedia {
    fn from(row: MediaRow) -> Self {
        Self {
            id: row.id,
            cloudinary_public_id: row.cloudinary_public_id,
            url: row.url,
            alt_text: row.alt_text,
            position: row.position,
        }
    }
}
