import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'auth_sheet.dart';
import 'favorites_screen.dart';
import 'messages_screen.dart';
import 'verification_screen.dart';

class ProfileScreen extends StatelessWidget {
  final ApiClient api;
  final LocalCache cache;
  final AppState appState;

  const ProfileScreen({
    super.key,
    required this.api,
    required this.cache,
    required this.appState,
  });

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: ListenableBuilder(
          listenable: appState,
          builder: (context, _) {
            if (!appState.signedIn) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.person_outline,
                        size: 64,
                        color: UnaColors.green700,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Sign in to manage your listings, favorites and verification.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: () => requireAuth(context, appState),
                        child: const Text('Sign in'),
                      ),
                    ],
                  ),
                ),
              );
            }

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: UnaColors.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: UnaColors.border),
                  ),
                  child: const Row(
                    children: [
                      CircleAvatar(
                        radius: 26,
                        backgroundColor: UnaColors.green100,
                        child: Icon(
                          Icons.person,
                          color: UnaColors.green900,
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Signed in',
                              style: TextStyle(
                                color: UnaColors.text900,
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Your UnaDomot account',
                              style: TextStyle(
                                color: UnaColors.text500,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _ProfileTile(
                  icon: Icons.favorite_border,
                  title: 'Favorites',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => FavoritesScreen(
                        api: api,
                        cache: cache,
                        appState: appState,
                      ),
                    ),
                  ),
                ),
                _ProfileTile(
                  icon: Icons.chat_bubble_outline,
                  title: 'Messages',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => MessagesScreen(api: api),
                    ),
                  ),
                ),
                _ProfileTile(
                  icon: Icons.verified_outlined,
                  title: 'Verification',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => VerificationScreen(api: api),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () async {
                    await appState.signOut();
                    if (context.mounted) Navigator.pop(context);
                  },
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign out'),
                ),
              ],
            );
          },
        ),
      );
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _ProfileTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Material(
          color: UnaColors.surface,
          borderRadius: BorderRadius.circular(8),
          child: ListTile(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            leading: Icon(icon, color: UnaColors.green700),
            title: Text(title),
            trailing: const Icon(Icons.chevron_right),
            onTap: onTap,
          ),
        ),
      );
}
