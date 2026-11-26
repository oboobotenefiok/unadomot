import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../theme.dart';

class ListingCodeScreen extends StatelessWidget {
  final String code;
  final String title;

  const ListingCodeScreen({
    super.key,
    required this.code,
    required this.title,
  });

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Listing code')),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: UnaColors.border),
                  ),
                  child: QrImageView(
                    data: code,
                    version: QrVersions.auto,
                    size: 240,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  code,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 3,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Scan this code or type it into Find by Code.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: UnaColors.text600),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: code));
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Code $code copied')),
                    );
                  },
                  icon: const Icon(Icons.copy),
                  label: const Text('Copy code'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => Share.share(
                    'Find this listing on UnaDomot with code $code\nhttps://unadomot.fly.dev',
                    subject: title,
                  ),
                  icon: const Icon(Icons.share_outlined),
                  label: const Text('Share code'),
                ),
              ],
            ),
          ),
        ),
      );
}
