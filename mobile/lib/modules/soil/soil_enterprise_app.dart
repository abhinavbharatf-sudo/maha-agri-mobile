// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Step 6: Flutter Multi-Role Soil Testing App (AGRIDOOT, Lab Chemist, Farmer)
// Strict Compliance: No Business Logic in Mobile UI (Pure API Client)
// Universal Sample Header, Timeline, & Color Conventions
// ============================================================================

import 'package:flutter/material.dart';

void main() {
  runApp(const MahaAgriSoilApp());
}

class MahaAgriSoilApp extends StatelessWidget {
  const MahaAgriSoilApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MAHA-AGRI Soil Testing App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.emerald,
        fontFamily: 'Inter',
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const SoilRoleSelectionScreen(),
    );
  }
}

enum SoilUserRole { agridoot, chemist, farmer }

class SoilRoleSelectionScreen extends StatefulWidget {
  const SoilRoleSelectionScreen({Key? key}) : super(key: key);

  @override
  State<SoilRoleSelectionScreen> createState() => _SoilRoleSelectionScreenState();
}

class _SoilRoleSelectionScreenState extends State<SoilRoleSelectionScreen> {
  SoilUserRole _selectedRole = SoilUserRole.agridoot;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MAHA-AGRI Soil Testing App'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Select Persona for Soil Testing App',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            const Text(
              'Single Flutter codebase for MAHA-AGRIDOOT, Lab Chemist & Farmer powered by NestJS REST API',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 20),
            _buildRoleCard(
              SoilUserRole.agridoot,
              'MAHA-AGRIDOOT App',
              'Farmer Registration, 7/12 Parcel Mapping, Sample Geo-tagging & QR Scanning',
              Icons.agriculture,
              Colors.emerald,
            ),
            const SizedBox(height: 12),
            _buildRoleCard(
              SoilUserRole.chemist,
              'Lab Chemist App',
              'Sample Receipt, 12-Parameter Test Entry, QC Approval & Verification',
              Icons.biotech,
              Colors.purple,
            ),
            const SizedBox(height: 12),
            _buildRoleCard(
              SoilUserRole.farmer,
              'Farmer Portal App',
              'View Sample Status, Download Soil Health Card PDF & NPK Crop Advisory',
              Icons.person,
              Colors.blue,
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => SoilRoleDashboardScreen(role: _selectedRole)),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Launch Persona Dashboard', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleCard(SoilUserRole role, String title, String desc, IconData icon, Color color) {
    final isSelected = _selectedRole == role;
    return GestureDetector(
      onTap: () => setState(() => _selectedRole = role),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? color : const Color(0xFFE2E8F0), width: isSelected ? 2 : 1),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  const SizedBox(height: 4),
                  Text(desc, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SoilRoleDashboardScreen extends StatelessWidget {
  final SoilUserRole role;
  const SoilRoleDashboardScreen({Key? key, required this.role}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    String roleTitle = role == SoilUserRole.agridoot ? 'MAHA-AGRIDOOT Soil App' : (role == SoilUserRole.chemist ? 'Lab Chemist Console' : 'Farmer Soil Portal');

    return Scaffold(
      appBar: AppBar(
        title: Text(roleTitle),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Universal Sample Header (Soil Standard 1)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('ST-2026-000125', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                        child: const Text('PRIORITY: URGENT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('Farmer: Rahul Patil | Village: Seloo, Wardha', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 4),
                  const Text('Lab: Wardha Soil Lab | AGRIDOOT: Ajay Patil', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 12),
                  LinearProgressIndicator(value: 0.58, backgroundColor: const Color(0xFFE2E8F0), color: const Color(0xFF059669)),
                  const SizedBox(height: 8),
                  const Text('Status: TESTING_IN_PROGRESS | Next: Enter 12 Lab Results', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action Driven Primary Action Button (Soil Standard 3)
            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('API Call Triggered: /api/v1/soil/samples/ST-2026-000125/test-result')),
                );
              },
              icon: const Icon(Icons.science),
              label: const Text('Enter 12-Parameter Lab Test Results'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
