import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../data/local_cache.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'main_shell.dart';

class OnboardingScreen extends StatefulWidget {
  final LocalCache cache;
  final ApiClient api;
  final AppState appState;

  const OnboardingScreen({
    super.key,
    required this.cache,
    required this.api,
    required this.appState,
  });

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _pages = [
    _OnboardPage(
      icon: Icons.home_work_outlined,
      title: 'Find a home that fits',
      body: 'Browse verified rentals across Nigeria. Search by state, LGA, price, or property type.',
    ),
    _OnboardPage(
      icon: Icons.map_outlined,
      title: 'See it on the map',
      body: 'Switch to map view to explore listings by area, then open a listing for photos and details.',
    ),
    _OnboardPage(
      icon: Icons.add_home_outlined,
      title: 'Post your place',
      body: 'Tap the plus button to list a property. Add photos, price, amenities, and the exact location.',
    ),
    _OnboardPage(
      icon: Icons.chat_bubble_outline,
      title: 'Chat, call, and save',
      body: 'Message a lister, start a voice or video call, and save favorites to revisit later.',
    ),
    _OnboardPage(
      icon: Icons.person_outline,
      title: 'Your profile',
      body: 'Manage your listings, get verified, switch to dark mode, and find privacy settings.',
    ),
  ];

  Future<void> _finish() async {
    await widget.cache.setSetting('onboarding_seen', 'true');
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => MainShell(
          api: widget.api,
          cache: widget.cache,
          appState: widget.appState,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _page == _pages.length - 1;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: _finish,
                child: const Text('Skip'),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _pages.length,
                onPageChanged: (index) => setState(() => _page = index),
                itemBuilder: (context, index) => _pages[index],
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _pages.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _page == index ? 22 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _page == index
                        ? UnaColors.primary
                        : Theme.of(context).colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    if (isLast) {
                      _finish();
                    } else {
                      _controller.nextPage(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeOut,
                      );
                    }
                  },
                  child: Text(isLast ? 'Get started' : 'Next'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardPage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;

  const _OnboardPage({
    required this.icon,
    required this.title,
    required this.body,
  });

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: UnaColors.green100,
                borderRadius: BorderRadius.circular(28),
              ),
              child: Icon(icon, size: 56, color: UnaColors.green900),
            ),
            const SizedBox(height: 32),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w700,
                color: UnaColors.text900,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              body,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                height: 1.5,
                color: UnaColors.text600,
              ),
            ),
          ],
        ),
      );
}
