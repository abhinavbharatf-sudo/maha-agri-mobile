// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Step 7: Flutter Multi-Role EDP App (MAHA-AGRIDOOT, Candidate, Trainer)
// Strict Compliance: No Business Logic in Mobile UI (Pure API Client)
// Enforces Universal Status Card, Color Conventions, & Timeline
// ============================================================================

import 'package:flutter/material.dart';

void main() {
  runApp(const MahaAgriEdpApp());
}

class MahaAgriEdpApp extends StatelessWidget {
  const MahaAgriEdpApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MAHA-AGRI EDP Drone App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.emerald,
        fontFamily: 'Inter',
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const EdpRoleSelectionScreen(),
    );
  }
}

enum UserRole { agridoot, candidate, trainer }

class EdpRoleSelectionScreen extends StatefulWidget {
  const EdpRoleSelectionScreen({Key? key}) : super(key: key);

  @override
  State<EdpRoleSelectionScreen> createState() => _EdpRoleSelectionScreenState();
}

class _EdpRoleSelectionScreenState extends State<EdpRoleSelectionScreen> {
  UserRole _selectedRole = UserRole.agridoot;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MAHA-AGRI EDP Drone Platform'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Select User Role for Login',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            const Text(
              'Single Flutter codebase serving MAHA-AGRIDOOT, Candidate & Trainer apps powered by NestJS REST API',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 20),
            _buildRoleCard(
              UserRole.agridoot,
              'MAHA-AGRIDOOT App',
              'Lead Survey, Registration, Candidate Management & Tasks',
              Icons.people_alt,
              Colors.emerald,
            ),
            const SizedBox(height: 12),
            _buildRoleCard(
              UserRole.candidate,
              'Candidate Portal App',
              'OTP Login, Photo & Aadhaar Upload, Workshop & Certificate',
              Icons.person,
              Colors.blue,
            ),
            const SizedBox(height: 12),
            _buildRoleCard(
              UserRole.trainer,
              'Trainer & Assessor App',
              'GPS Attendance, Batch Grading, Assessment & Ground Training',
              Icons.school,
              Colors.purple,
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => EdpRoleDashboardScreen(role: _selectedRole)),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Launch Role Dashboard', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleCard(UserRole role, String title, String desc, IconData icon, Color color) {
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

class EdpRoleDashboardScreen extends StatelessWidget {
  final UserRole role;
  const EdpRoleDashboardScreen({Key? key, required this.role}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    String roleTitle = role == UserRole.agridoot ? 'MAHA-AGRIDOOT Console' : (role == UserRole.candidate ? 'Candidate Portal' : 'Trainer Console');

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
            // Universal Status Card Header (Standard 1)
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
                      const Text('Rahul Shende', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(8)),
                        child: const Text('EDP26000125', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('Status: WORKSHOP_COMPLETED | Track: Drone Entrepreneur', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 12),
                  LinearProgressIndicator(value: 0.62, backgroundColor: const Color(0xFFE2E8F0), color: const Color(0xFF059669)),
                  const SizedBox(height: 8),
                  const Text('Lifecycle Progress: 62% | Next: Business Readiness Audit', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action-Driven Primary Action Button (Standard 3)
            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('API Call Triggered: /api/v1/edp/candidates/EDP26000125/career-choice')),
                );
              },
              icon: const Icon(Icons.play_circle_fill),
              label: const Text('Execute Next Action'),
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
