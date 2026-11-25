use crate::application::listings::{ListingError, ListingRepository};
use crate::domain::listing::{Listing, ListingFilter, ListingStatus};
use sqlx::PgPool;

pub struct PostgresListingRepository {
    pool: PgPool,
}

impl PostgresListingRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl ListingRepository for PostgresListingRepository {
    fn browse(&self, _filter: &ListingFilter) -> Result<Vec<Listing>, ListingError> {
        let rows = sqlx::query_as::<_, ListingRow>(
            "SELECT id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing FROM listings WHERE deleted_at IS NULL AND status = 'available' ORDER BY created_at DESC LIMIT 50",
        )
        .fetch_all(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        Ok(rows.into_iter().map(ListingRow::into).collect())
    }

    fn get(&self, id: uuid::Uuid) -> Result<Option<Listing>, ListingError> {
        let row = sqlx::query_as::<_, ListingRow>(
            "SELECT id, landlord_id, title, description, price, address, state, lga, is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing FROM listings WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        Ok(row.map(ListingRow::into))
    }
}

#[derive(sqlx::FromRow)]
struct ListingRow {
    id: uuid::Uuid,
    landlord_id: uuid::Uuid,
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
