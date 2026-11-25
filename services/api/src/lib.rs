pub mod domain {
    #[derive(Clone, Debug)]
    pub struct Listing {
        pub id: String,
        pub title: String,
    }
}

pub mod application {
    use crate::domain::Listing;

    #[derive(Debug)]
    pub enum RepositoryError {
        Unavailable,
    }

    pub trait ListingRepository: Send + Sync {
        fn list(&self) -> Result<Vec<Listing>, RepositoryError>;
    }

    pub fn browse_listings(
        repository: &dyn ListingRepository,
    ) -> Result<Vec<Listing>, RepositoryError> {
        repository.list()
    }
}

pub mod adapters {
    use crate::application::{ListingRepository, RepositoryError};
    use crate::domain::Listing;

    pub struct UnconfiguredRepository;

    impl ListingRepository for UnconfiguredRepository {
        fn list(&self) -> Result<Vec<Listing>, RepositoryError> {
            Err(RepositoryError::Unavailable)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::application::{browse_listings, ListingRepository, RepositoryError};
    use super::domain::Listing;

    struct TestRepository;

    impl ListingRepository for TestRepository {
        fn list(&self) -> Result<Vec<Listing>, RepositoryError> {
            Ok(vec![Listing {
                id: "test".into(),
                title: "Flat".into(),
            }])
        }
    }

    #[test]
    fn browsing_uses_repository_port() {
        let listings = browse_listings(&TestRepository).unwrap();
        assert_eq!(listings[0].id, "test");
    }
}
