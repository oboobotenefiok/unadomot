import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../models/listing.dart';
import '../theme.dart';
import '../utils/share_helper.dart';

Future<void> showShareListingSheet(BuildContext context, Listing listing) async {
  final link = listingShareLink(listing);
  final text = listingShareText(listing);

  await showModalBottomSheet<void>(
    context: context,
    useSafeArea: true,
    isScrollControlled: true,
    builder: (context) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: UnaColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Share this listing',
            style: TextStyle(
              color: UnaColors.text900,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _ShareAction(
                  icon: Icons.ios_share,
                  label: 'Share to apps',
                  onTap: () => Share.share(text, subject: listing.title),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ShareAction(
                  icon: Icons.copy,
                  label: 'Copy link',
                  onTap: () async {
                    await Clipboard.setData(ClipboardData(text: link));
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Listing link copied')),
                    );
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: UnaColors.border),
            ),
            child: Column(
              children: [
                QrImageView(
                  data: link,
                  size: 190,
                  backgroundColor: Colors.white,
                  eyeStyle: const QrEyeStyle(
                    eyeShape: QrEyeShape.square,
                    color: UnaColors.green900,
                  ),
                  dataModuleStyle: const QrDataModuleStyle(
                    dataModuleShape: QrDataModuleShape.square,
                    color: UnaColors.green900,
                  ),
                  embeddedImage: const AssetImage('assets/unadomot.jpg'),
                  embeddedImageStyle: const QrEmbeddedImageStyle(
                    size: Size(42, 42),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  listing.code == null ? 'Scan to open listing' : 'Scan or use code ${listing.code}',
                  style: const TextStyle(
                    color: UnaColors.text600,
                    fontSize: 12,
                  ),
                ),
                if (listing.code != null) ...[
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: listing.code!));
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Code ${listing.code} copied')),
                      );
                    },
                    icon: const Icon(Icons.copy, size: 16),
                    label: const Text('Copy code'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _ShareAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ShareAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            color: UnaColors.green100,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            children: [
              Icon(icon, color: UnaColors.green900),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: UnaColors.green900,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
}
