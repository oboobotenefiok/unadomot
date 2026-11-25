import 'package:flutter/material.dart';

void main() => runApp(const UnaDomotApp());

class UnaDomotApp extends StatelessWidget {
  const UnaDomotApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'UnaDomot',
        theme: ThemeData(colorSchemeSeed: Colors.green, useMaterial3: true),
        home: const HomePage(),
      );
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool listing = false;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('UnaDomot')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Your next home, closer.'),
                const SizedBox(height: 24),
                SwitchListTile(
                  title: const Text('Landlord / agent mode'),
                  value: listing,
                  onChanged: (value) => setState(() => listing = value),
                ),
                const SizedBox(height: 24),
                Text(listing ? 'Manage your listings' : 'Find a rental'),
                const SizedBox(height: 12),
                const Text(
                  'Foundation preview. Listings, sign-in and messaging are not connected yet.',
                ),
              ],
            ),
          ),
        ),
      );
}
