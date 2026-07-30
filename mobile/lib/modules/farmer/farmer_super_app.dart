// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Production Sprint 4: Flutter Farmer Mobile Super App
// Single Digital Gateway for Farmers across Maharashtra (MA-FAR-xxxxxx)
// Consumes Platform Core, Soil Testing, EDP Drone, Vault, & GIS Services
// ============================================================================

import 'package:flutter/material.dart';

void main() {
  runApp(const MahaAgriFarmerSuperApp());
}

class MahaAgriFarmerSuperApp extends StatelessWidget {
  const MahaAgriFarmerSuperApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MAHA-AGRI Farmer Super App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.emerald,
        fontFamily: 'Inter',
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const FarmerSuperAppHomeScreen(),
    );
  }
}

class FarmerSuperAppHomeScreen extends StatelessWidget {
  const FarmerSuperAppHomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MAHA-AGRI Farmer Super App'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Permanent MA-FAR Farmer Identity Digital Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF065F46),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Rahul Vasant Patil', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                        child: const Text('MA-FAR-984210', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('Village: Seloo | Taluka: Seloo | District: Wardha', style: TextStyle(fontSize: 12, color: Color(0xFFA7F3D0))),
                  const SizedBox(height: 12),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Aadhaar KYC: VERIFIED ✓', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                      Text('7/12 Linked: 4.5 Acres', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Quick Service Gateway Buttons
            const Text('Super App Digital Services', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _buildServiceTile(
                    context,
                    'Soil Health Card',
                    'Request Test & Download PDF',
                    Icons.biotech,
                    Colors.emerald,
                    '/api/v1/soil/farmers/register',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildServiceTile(
                    context,
                    'Agri Drone Spray',
                    'Book Spray & Track Booking',
                    Icons.flight_takeoff,
                    Colors.purple,
                    '/api/v1/edp/drone-bookings',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildServiceTile(
                    context,
                    '7/12 Land Portfolio',
                    'View Survey & Gat Numbers',
                    Icons.landscape,
                    Colors.amber,
                    '/api/v1/farmers/land-holdings',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildServiceTile(
                    context,
                    'Document Locker',
                    'Certificates & PDF Vault',
                    Icons.folder_shared,
                    Colors.blue,
                    '/api/v1/platform/vault',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceTile(BuildContext context, String title, String subtitle, IconData icon, Color color, String apiRoute) {
    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Triggered Gateway API: $apiRoute')),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }
}
