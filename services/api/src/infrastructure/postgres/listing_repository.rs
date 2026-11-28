use crate::application::listings::{ListingError, ListingPage, ListingRepository};
use crate::domain::listing::{
    Listing, ListingFilter, ListingMedia, ListingStatus, ListingUpdate, NewListing,
    NewListingMedia,
};
use async_trait::async_trait;
use rust_decimal::Decimal;
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

const LISTING_COLUMNS: &str = "l.id, l.landlord_id,
    COALESCE((SELECT name FROM user_profiles WHERE user_id = l.landlord_id), '') AS landlord_name,
    COALESCE((SELECT verified FROM user_profiles WHERE user_id = l.landlord_id), false) AS landlord_verified,
    (SELECT photo_url FROM user_profiles WHERE user_id = l.landlord_id) AS landlord_photo_url,
    l.title, l.description, l.price, l.address, l.state, l.lga, l.is_agent_listing, l.status,
    l.bedrooms, l.bathrooms, l.property_type, l.furnishing, l.amenities, l.code, l.created_at";

pub struct PostgresListingRepository {
    pool: PgPool,
}

impl PostgresListingRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ListingRepository for PostgresListingRepository {
    async fn browse(
        &self,
        filter: &ListingFilter,
        limit: i64,
        offset: i64,
    ) -> Result<ListingPage, ListingError> {
        let query = format!(
            "SELECT {LISTING_COLUMNS} FROM listings l WHERE l.deleted_at IS NULL AND l.status = 'available' AND ($1::text IS NULL OR l.state = $1) AND ($2::text IS NULL OR l.lga = $2) AND ($3::text IS NULL OR l.property_type = $3) AND ($4::numeric IS NULL OR l.price >= $4) AND ($5::numeric IS NULL OR l.price <= $5) AND ($6::integer IS NULL OR l.bedrooms >= $6) AND ($7::text IS NULL OR l.furnishing = $7) ORDER BY l.created_at DESC LIMIT $8 OFFSET $9"
        );
        let rows = sqlx::query_as::<_, ListingRow>(&query)
            .bind(filter.state.as_deref())
            .bind(filter.lga.as_deref())
            .bind(filter.property_type.as_deref())
            .bind(filter.min_price)
            .bind(filter.max_price)
            .bind(filter.bedrooms)
            .bind(filter.furnishing.as_deref())
            .bind(limit + 1)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| ListingError::Repository(e.to_string()))?;

        let has_more = rows.len() as i64 > limit;
        let rows: Vec<ListingRow> = rows.into_iter().take(limit as usize).collect();
        let ids: Vec<Uuid> = rows.iter().map(|row| row.id).collect();
        let media = self.load_media_for(&ids).await?;

        let items = rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut listing: Listing = row.into();
                listing.media = media.get(&id).cloned().unwrap_or_default();
                listing
            })
            .collect();

        Ok(ListingPage {
            items,
            has_more,
            next_offset: offset + limit,
        })
    }

    async fn get(&self, id: Uuid) -> Result<Option<Listing>, ListingError> {
        let query = format!(
            "SELECT {LISTING_COLUMNS} FROM listings l WHERE l.id = $1 AND l.deleted_at IS NULL"
        );
        let row = sqlx::query_as::<_, ListingRow>(&query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| ListingError::Repository(e.to_string()))?;

        let Some(row) = row else {
            return Ok(None);
        };

        let mut listing: Listing = row.into();
        listing.media = self
            .load_media_for(&[id])
            .await?
            .remove(&id)
            .unwrap_or_default();
        Ok(Some(listing))
    }

    async fn get_public(&self, id: Uuid) -> Result<Option<Listing>, ListingError> {
        let query = format!(
            "SELECT {LISTING_COLUMNS} FROM listings l WHERE l.id = $1 AND l.deleted_at IS NULL AND l.status = 'available'"
        );
        let row = sqlx::query_as::<_, ListingRow>(&query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| ListingError::Repository(e.to_string()))?;

        let Some(row) = row else {
            return Ok(None);
        };

        let mut listing: Listing = row.into();
        listing.media = self
            .load_media_for(&[id])
            .await?
            .remove(&id)
            .unwrap_or_default();
        Ok(Some(listing))
    }

    async fn list_by_owner(&self, owner_id: Uuid) -> Result<Vec<Listing>, ListingError> {
        let query = format!(
            "SELECT {LISTING_COLUMNS} FROM listings l WHERE l.landlord_id = $1 AND l.deleted_at IS NULL ORDER BY l.created_at DESC"
        );
        let rows = sqlx::query_as::<_, ListingRow>(&query)
            .bind(owner_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| ListingError::Repository(e.to_string()))?;

        let ids: Vec<Uuid> = rows.iter().map(|row| row.id).collect();
        let media = self.load_media_for(&ids).await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut listing: Listing = row.into();
                listing.media = media.get(&id).cloned().unwrap_or_default();
                listing
            })
            .collect())
    }

    async fn list_favorites(&self, user_id: Uuid) -> Result<Vec<Listing>, ListingError> {
        let query = format!(
            "SELECT {LISTING_COLUMNS} FROM listings l JOIN favorites f ON f.listing_id = l.id WHERE f.user_id = $1 AND l.deleted_at IS NULL ORDER BY f.created_at DESC"
        );
        let rows = sqlx::query_as::<_, ListingRow>(&query)
            .bind(user_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| ListingError::Repository(e.to_string()))?;

        let ids: Vec<Uuid> = rows.iter().map(|row| row.id).collect();
        let media = self.load_media_for(&ids).await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut listing: Listing = row.into();
                listing.media = media.get(&id).cloned().unwrap_or_default();
                listing
            })
            .collect())
    }

    async fn add_favorite(&self, user_id: Uuid, listing_id: Uuid) -> Result<(), ListingError> {
        sqlx::query(
            "INSERT INTO favorites (user_id, listing_id) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM listings WHERE id = $2 AND deleted_at IS NULL) ON CONFLICT DO NOTHING",
        )
        .bind(user_id)
        .bind(listing_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn remove_favorite(&self, user_id: Uuid, listing_id: Uuid) -> Result<(), ListingError> {
        sqlx::query("DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2")
            .bind(user_id)
            .bind(listing_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ListingError::Repository(e.to_string()))?;
        Ok(())
    }

    async fn create(&self, input: &NewListing) -> Result<Listing, ListingError> {
        let id = sqlx::query_scalar::<_, Uuid>(
            "INSERT INTO listings (landlord_id, title, description, price, address, state, lga, is_agent_listing, bedrooms, bathrooms, property_type, furnishing, amenities) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id",
        )
        .bind(input.landlord_id)
        .bind(input.title.trim())
        .bind(input.description.trim())
        .bind(input.price)
        .bind(input.address.trim())
        .bind(input.state.trim())
        .bind(input.lga.trim())
        .bind(input.is_agent_listing)
        .bind(input.bedrooms)
        .bind(input.bathrooms)
        .bind(input.property_type.as_deref())
        .bind(input.furnishing.as_deref())
        .bind(&input.amenities)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        self.get(id).await?.ok_or(ListingError::NotFound)
    }

    async fn update(
        &self,
        id: Uuid,
        owner_id: Uuid,
        update: &ListingUpdate,
    ) -> Result<Listing, ListingError> {
        let updated = sqlx::query_scalar::<_, Uuid>(
            "UPDATE listings SET title = COALESCE($3, title), description = COALESCE($4, description), price = COALESCE($5, price), address = COALESCE($6, address), state = COALESCE($7, state), lga = COALESCE($8, lga), is_agent_listing = COALESCE($9, is_agent_listing), status = COALESCE($10, status), bedrooms = CASE WHEN $11 THEN $12 ELSE bedrooms END, bathrooms = CASE WHEN $13 THEN $14 ELSE bathrooms END, property_type = CASE WHEN $15 THEN $16 ELSE property_type END, furnishing = CASE WHEN $17 THEN $18 ELSE furnishing END, amenities = CASE WHEN $19 THEN $20 ELSE amenities END, updated_at = now() WHERE id = $1 AND landlord_id = $2 AND deleted_at IS NULL RETURNING id",
        )
        .bind(id)
        .bind(owner_id)
        .bind(update.title.as_deref())
        .bind(update.description.as_deref())
        .bind(update.price)
        .bind(update.address.as_deref())
        .bind(update.state.as_deref())
        .bind(update.lga.as_deref())
        .bind(update.is_agent_listing)
        .bind(update.status.map(|status| status.as_str().to_string()))
        .bind(update.bedrooms.is_some())
        .bind(update.bedrooms.flatten())
        .bind(update.bathrooms.is_some())
        .bind(update.bathrooms.flatten())
        .bind(update.property_type.is_some())
        .bind(update.property_type.clone().flatten())
        .bind(update.furnishing.is_some())
        .bind(update.furnishing.clone().flatten())
        .bind(update.amenities.is_some())
        .bind(update.amenities.clone())
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        let id = updated.ok_or(ListingError::NotFound)?;
        self.get(id).await?.ok_or(ListingError::NotFound)
    }

    async fn delete(&self, id: Uuid, owner_id: Uuid) -> Result<(), ListingError> {
        let result = sqlx::query(
            "UPDATE listings SET deleted_at = now(), updated_at = now() WHERE id = $1 AND landlord_id = $2 AND deleted_at IS NULL",
        )
        .bind(id)
        .bind(owner_id)
        .execute(&self.pool)
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(ListingError::NotFound);
        }
        Ok(())
    }

    async fn admin_remove(
        &self,
        id: Uuid,
        admin_id: Uuid,
        reason: &str,
    ) -> Result<Listing, ListingError> {
        let updated = sqlx::query_scalar::<_, Uuid>(
            "UPDATE listings SET status = 'removed_by_admin', removed_at = now(), removed_by = $2, removed_reason = $3, updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id",
        )
        .bind(id)
        .bind(admin_id)
        .bind(reason)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        let id = updated.ok_or(ListingError::NotFound)?;
        self.get(id).await?.ok_or(ListingError::NotFound)
    }

    async fn admin_restore(&self, id: Uuid, _admin_id: Uuid) -> Result<Listing, ListingError> {
        let updated = sqlx::query_scalar::<_, Uuid>(
            "UPDATE listings SET status = 'available', removed_at = NULL, removed_by = NULL, removed_reason = NULL, updated_at = now() WHERE id = $1 AND deleted_at IS NULL AND status = 'removed_by_admin' RETURNING id",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        let id = updated.ok_or(ListingError::NotFound)?;
        self.get(id).await?.ok_or(ListingError::NotFound)
    }

    async fn add_media(
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
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        if owned.is_none() {
            return Err(ListingError::NotFound);
        }

        let row = sqlx::query_as::<_, MediaRow>(
            "INSERT INTO listing_media (listing_id, cloudinary_public_id, url, alt_text, position) VALUES ($1, $2, $3, $4, $5) RETURNING listing_id, id, cloudinary_public_id, url, alt_text, position",
        )
        .bind(listing_id)
        .bind(media.cloudinary_public_id.trim())
        .bind(media.url.trim())
        .bind(media.alt_text.as_deref())
        .bind(media.position)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        Ok(row.into())
    }

    async fn health_check(&self) -> Result<(), ListingError> {
        sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(&self.pool)
            .await
            .map(|_| ())
            .map_err(|e| ListingError::Repository(e.to_string()))
    }
}

impl PostgresListingRepository {
    async fn load_media_for(
        &self,
        ids: &[Uuid],
    ) -> Result<HashMap<Uuid, Vec<ListingMedia>>, ListingError> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }

        let rows = sqlx::query_as::<_, MediaRow>(
            "SELECT listing_id, id, cloudinary_public_id, url, alt_text, position FROM listing_media WHERE listing_id = ANY($1) ORDER BY position ASC, created_at ASC",
        )
        .bind(ids)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| ListingError::Repository(e.to_string()))?;

        let mut grouped: HashMap<Uuid, Vec<ListingMedia>> = HashMap::new();
        for row in rows {
            let listing_id = row.listing_id;
            grouped.entry(listing_id).or_default().push(row.into());
        }
        Ok(grouped)
    }
}

#[derive(sqlx::FromRow)]
struct ListingRow {
    id: Uuid,
    landlord_id: Uuid,
    landlord_name: String,
    landlord_verified: bool,
    landlord_photo_url: Option<String>,
    title: String,
    description: String,
    price: Decimal,
    address: String,
    state: String,
    lga: String,
    is_agent_listing: bool,
    status: String,
    bedrooms: Option<i32>,
    bathrooms: Option<i32>,
    property_type: Option<String>,
    furnishing: Option<String>,
    amenities: Vec<String>,
    code: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<ListingRow> for Listing {
    fn from(row: ListingRow) -> Self {
        Self {
            id: row.id,
            landlord_id: row.landlord_id,
            landlord_name: row.landlord_name,
            landlord_verified: row.landlord_verified,
            landlord_photo_url: row.landlord_photo_url,
            title: row.title,
            description: row.description,
            price: row.price,
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
            amenities: row.amenities,
            code: row.code,
            created_at: row.created_at,
            media: Vec::new(),
        }
    }
}

#[derive(sqlx::FromRow)]
struct MediaRow {
    listing_id: Uuid,
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
