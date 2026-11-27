import 'package:flutter/material.dart';
import '../theme.dart';

class StaticPageScreen extends StatelessWidget {
  final String title;
  final List<StaticSection> sections;

  const StaticPageScreen({
    super.key,
    required this.title,
    required this.sections,
  });

  factory StaticPageScreen.terms() => const StaticPageScreen(
        title: 'Terms of Service',
        sections: [
          StaticSection(
            'Using UnaDomot',
            'UnaDomot helps people discover, list, and discuss property across Nigeria. By using the app, you agree to provide accurate information and to use the platform lawfully.',
          ),
          StaticSection(
            'Listings and content',
            'You are responsible for the listings, photos, and messages you post. Do not post false, misleading, discriminatory, or infringing content. We may remove content that breaks these rules.',
          ),
          StaticSection(
            'Transactions',
            'UnaDomot is a marketplace and does not own or inspect listed properties. Verify documents, ownership, and payment details directly with the other party before committing.',
          ),
          StaticSection(
            'Account suspension',
            'We may suspend accounts that repeatedly violate these terms, attempt fraud, or misuse other people\'s information.',
          ),
        ],
      );

  factory StaticPageScreen.privacy() => const StaticPageScreen(
        title: 'Privacy Policy',
        sections: [
          StaticSection(
            'What we collect',
            'We collect the account details you provide, listings and messages you create, and basic device information needed to keep the app secure and reliable.',
          ),
          StaticSection(
            'How we use it',
            'Your information is used to operate your account, show relevant listings, enable messaging, prevent abuse, and improve the product.',
          ),
          StaticSection(
            'Sharing',
            'We do not sell your personal information. We share data only with service providers that help us run the platform, or when required by law.',
          ),
          StaticSection(
            'Your choices',
            'You can update your profile, delete listings, and request account deletion from the profile settings.',
          ),
        ],
      );

  factory StaticPageScreen.checkoutNotice() => const StaticPageScreen(
        title: 'Checkout Notice',
        sections: [
          StaticSection(
            'Payments happen off-platform',
            'UnaDomot does not process rent or property payments inside the app. Any payment is arranged directly between you and the other party.',
          ),
          StaticSection(
            'Before you pay',
            'Inspect the property, confirm ownership documents, and use a traceable payment method. Never pay before verifying the person and the property.',
          ),
          StaticSection(
            'Report a problem',
            'If someone asks for an unusual upfront payment or pressures you to pay quickly, report the listing from its detail page.',
          ),
        ],
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(title)),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            for (final section in sections) ...[
              Text(
                section.heading,
                style: const TextStyle(
                  color: UnaColors.text900,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                section.body,
                style: const TextStyle(
                  color: UnaColors.text500,
                  fontSize: 14,
                  height: 1.55,
                ),
              ),
              const SizedBox(height: 20),
            ],
          ],
        ),
      );
}

class StaticSection {
  final String heading;
  final String body;

  const StaticSection(this.heading, this.body);
}

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Page not found')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(
                    color: UnaColors.green100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.explore_off_outlined, size: 38, color: UnaColors.green700),
                ),
                const SizedBox(height: 16),
                const Text(
                  'This page does not exist',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                const Text(
                  'The link may be broken, or the page may have moved.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: UnaColors.text500, fontSize: 14, height: 1.4),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                  child: const Text('Back to home'),
                ),
              ],
            ),
          ),
        ),
      );
}
