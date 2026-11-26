pub const STATES: &[&str] = &[
    "Abia",
    "Adamawa",
    "Akwa Ibom",
    "Anambra",
    "Bauchi",
    "Bayelsa",
    "Benue",
    "Borno",
    "Cross River",
    "Delta",
    "Ebonyi",
    "Edo",
    "Ekiti",
    "Enugu",
    "FCT",
    "Gombe",
    "Imo",
    "Jigawa",
    "Kaduna",
    "Kano",
    "Katsina",
    "Kebbi",
    "Kogi",
    "Kwara",
    "Lagos",
    "Nasarawa",
    "Niger",
    "Ogun",
    "Ondo",
    "Osun",
    "Oyo",
    "Plateau",
    "Rivers",
    "Sokoto",
    "Taraba",
    "Yobe",
    "Zamfara",
];

pub fn normalize_state(value: &str) -> Option<&'static str> {
    let value = value.trim();
    STATES
        .iter()
        .copied()
        .find(|state| state.eq_ignore_ascii_case(value))
}

pub fn validate_lga(value: &str) -> bool {
    let value = value.trim();
    !value.is_empty() && value.len() <= 80 && !value.chars().any(|c| c.is_control())
}
