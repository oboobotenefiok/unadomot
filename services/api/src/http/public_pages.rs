use crate::application::listings::get_listing;
use crate::http::{AppState, ApiError};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Html,
    routing::get,
    Router,
};
use uuid::Uuid;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/listing/{id}", get(listing_page))
        .route("/sitemap.xml", get(sitemap))
        .with_state(state)
}

async fn listing_page(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Html<String>, ApiError> {
    let listing = get_listing(state.listings.as_ref(), id)
        .await
        .map_err(|_| ApiError::new(StatusCode::SERVICE_UNAVAILABLE, "service_unavailable", "The service is temporarily unavailable"))?
        .ok_or_else(|| ApiError::new(StatusCode::NOT_FOUND, "not_found", "Listing not found"))?;

    let base = std::env::var("PUBLIC_WEB_URL").unwrap_or_else(|_| "https://unadomot.com".into());
    let canonical = format!("{base}/listing/{}", listing.id);
    let title = format!(
        "{} in {}, {} — ₦{}/year",
        listing.title, listing.lga, listing.state, listing.price
    );
    let description = format!(
        "{} • {} bedrooms • {} bathrooms • Verified listing on UnaDomot.",
        listing.title,
        listing.bedrooms.map(|v| v.to_string()).unwrap_or_else(|| "—".into()),
        listing.bathrooms.map(|v| v.to_string()).unwrap_or_else(|| "—".into())
    );
    let image = listing
        .media
        .first()
        .map(|media| media.url.clone())
        .unwrap_or_else(|| format!("{base}/og-default.jpg"));

    let html = format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{image}">
<meta property="og:url" content="{canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{image}">
<script type="application/ld+json">{{json_ld}}</script>
</head>
<body>
<main>
<h1>{title}</h1>
<p>{description}</p>
<p><strong>₦{price}/year</strong></p>
<img src="{image}" alt="{title}" width="1200" height="630" loading="eager">
<p>{listing_description}</p>
<p><a href="unadomot://listing/{id}">Open in the UnaDomot app</a></p>
</main>
</body>
</html>"#,
        title = escape(&title),
        description = escape(&description),
        canonical = escape(&canonical),
        image = escape(&image),
        price = listing.price,
        listing_description = escape(&listing.description),
        id = listing.id,
        json_ld = json_ld(&listing, &canonical, &image),
    );

    Ok(Html(html))
}

async fn sitemap(State(state): State<AppState>) -> Result<Html<String>, ApiError> {
    let page = crate::application::listings::browse_listings(
        state.listings.as_ref(),
        &Default::default(),
        50,
        0,
    )
    .await
    .map_err(|_| ApiError::new(StatusCode::SERVICE_UNAVAILABLE, "service_unavailable", "The service is temporarily unavailable"))?;

    let base = std::env::var("PUBLIC_WEB_URL").unwrap_or_else(|_| "https://unadomot.com".into());
    let urls = page
        .items
        .iter()
        .map(|listing| format!("<url><loc>{base}/listing/{}</loc></url>", listing.id))
        .collect::<String>();

    Ok(Html(format!(
        r#"<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>"#
    )))
}

fn json_ld(listing: &crate::domain::listing::Listing, canonical: &str, image: &str) -> String {
    let payload = serde_json::json!({
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": listing.title,
        "description": listing.description,
        "url": canonical,
        "image": image,
        "datePosted": chrono::Utc::now().to_rfc3339(),
        "offers": {
            "@type": "Offer",
            "price": listing.price.to_string(),
            "priceCurrency": "NGN",
            "availability": "https://schema.org/InStock"
        },
        "address": {
            "@type": "PostalAddress",
            "addressLocality": listing.lga,
            "addressRegion": listing.state,
            "addressCountry": "NG"
        }
    });

    payload.to_string().replace('<', "\\u003c")
}

fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
