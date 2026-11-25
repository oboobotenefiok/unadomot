use crate::application::listings::{ListingError, ListingRepository};
use crate::domain::listing::{Listing, ListingFilter, ListingStatus, NewListing};
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
            "SELECT id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing FROM listings WHERE deleted_at IS NULL AND status = 'available' AND ($1::text IS NULL OR state = $1) AND ($2::text IS NULL OR lga = $2) AND ($3::text IS NULL OR property_type = $3) ORDER BY created_at DESC LIMIT 50",
        )
        .bind(filter.state.as_deref())
        .bind(filter.lga.as_deref())
        .bind(filter.property_type.as_deref())
        .fetch_all(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(ListingRow::into).collect())
    }

    fn get(&self, id: Uuid) -> Result<Option<Listing>, ListingError> {
        let row = sqlx::query_as::<_, ListingRow>(
            "SELECT id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing FROM listings WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        Ok(row.map(ListingRow::into))
    }

    fn create(&self, input: &NewListing) -> Result<Listing, ListingError> {
        let row = sqlx::query_as::<_, ListingRow>(
            "INSERT INTO listings (landlord_id, title, description, price, address, state, lga, is_agent_listing, bedrooms, bathrooms, property_type, furnishing) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing",
        )
        .bind(input.landlord_id)
        .bind(input.title.trim())
        .bind(input.description.trim())
        .bind(rust_decimal::Decimal::from_f64_retain(input.price).unwrap_or_default())
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

        Ok(row.into())
    }
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
        }
    }
}
