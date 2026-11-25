use crate::application::auth::{AuthenticatedUser, AuthError, StoredUser, UserRepository};
use sqlx::PgPool;

pub struct PostgresUserRepository {
    pool: PgPool,
}

impl PostgresUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl UserRepository for PostgresUserRepository {
    fn create_user(
        &self,
        email: &str,
        password_hash: Option<&str>,
        name: &str,
    ) -> Result<AuthenticatedUser, AuthError> {
        let mut transaction = self
            .pool
            .begin()
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        let user = sqlx::query_as::<_, UserRow>(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash",
        )
        .bind(email)
        .bind(password_hash)
        .fetch_one(&mut *transaction)
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        sqlx::query("INSERT INTO user_profiles (user_id, name) VALUES ($1, $2)")
            .bind(user.id)
            .bind(name)
            .execute(&mut *transaction)
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        transaction
            .commit()
            .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(AuthenticatedUser {
            id: user.id,
            email: user.email,
        })
    }

    fn find_by_email(&self, email: &str) -> Result<Option<StoredUser>, AuthError> {
        let user = sqlx::query_as::<_, UserRow>(
            "SELECT id, email, password_hash FROM users WHERE lower(email) = lower($1)",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .map_err(|e| AuthError::Repository(e.to_string()))?;

        Ok(user.map(|row| StoredUser {
            id: row.id,
            email: row.email,
            password_hash: row.password_hash,
        }))
    }
}

#[derive(sqlx::FromRow)]
struct UserRow {
    id: uuid::Uuid,
    email: String,
    password_hash: Option<String>,
}
