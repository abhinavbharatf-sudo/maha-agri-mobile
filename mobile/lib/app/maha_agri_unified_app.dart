// ============================================================================
// MAHA-AGRI Government Digital Operations Platform (v1.0.1 Refinement)
// Single Unified Flutter Mobile Application: MAHA-AGRI
// Level 1 - 9 Hierarchy, Functional Roles, Payment Lock & Testing Agencies
// ============================================================================

import 'package:flutter/material.dart';

class MahaAgriUnifiedApp extends StatelessWidget {
  const MahaAgriUnifiedApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MAHA-AGRI Mobile App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.emerald,
        fontFamily: 'Inter',
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const UnifiedLoginScreen(),
    );
  }
}

enum AppRole {
  farmer,             // L1
  agridoot,           // L2
  soilChemist,        // L3 (Functional Role)
  droneEntrepreneur,  // L4 (Functional Role)
  talukaCoordinator,  // L5 (Field + Taluka Management)
  districtCoordinator,// L6 (Field + District Management)
  regionalManager,    // L7 (Field + Regional Operations)
  stateAdmin,         // L8 (Statewide Operations)
  superAdmin,         // L9 (Platform Owner)
}

class UnifiedLoginScreen extends StatefulWidget {
  const UnifiedLoginScreen({Key? key}) : super(key: key);

  @override
  State<UnifiedLoginScreen> createState() => _UnifiedLoginScreenState();
}

class _UnifiedLoginScreenState extends State<UnifiedLoginScreen> {
  AppRole _selectedRole = AppRole.districtCoordinator;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MAHA-AGRI Single Unified App'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'MAHA-AGRI Enterprise Login',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 6),
            const Text(
              'Level 1 - 9 Architecture: Management Hierarchy & Functional Roles',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),

            _buildRoleTile(AppRole.farmer, 'L1: Farmer', 'MA-FAR ID & Soil Cards', Icons.person, Colors.blue),
            _buildRoleTile(AppRole.agridoot, 'L2: MAHA-AGRIDOOT', 'Field Survey & Sample Collection', Icons.agriculture, Colors.emerald),
            _buildRoleTile(AppRole.soilChemist, 'L3: Soil Chemist (Functional)', 'Mobile QR Receive & Payment Lock', Icons.biotech, Colors.purple),
            _buildRoleTile(AppRole.droneEntrepreneur, 'L4: Drone Entrepreneur (Functional)', 'Drone Spray Bookings', Icons.flight_takeoff, Colors.indigo),
            _buildRoleTile(AppRole.talukaCoordinator, 'L5: Taluka Coordinator', 'Field Mode + Taluka Management', Icons.maps_home_work, Colors.amber),
            _buildRoleTile(AppRole.districtCoordinator, 'L6: District Coordinator', 'Field Mode + District Command Center', Icons.domain, Colors.orange),
            _buildRoleTile(AppRole.regionalManager, 'L7: Regional Manager', 'Field Mode + Regional Operations', Icons.public, Colors.teal),
            _buildRoleTile(AppRole.stateAdmin, 'L8: State Admin', 'Statewide Operations (Light Mobile Dashboard)', Icons.admin_panel_settings, Colors.red),
            _buildRoleTile(AppRole.superAdmin, 'L9: Super Admin (Platform Owner)', 'Secure 2FA Login Console', Icons.vpn_key, Colors.deepPurple),

            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => DynamicDashboardScreen(role: _selectedRole)),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Login into MAHA-AGRI App', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleTile(AppRole role, String title, String desc, IconData icon, Color color) {
    final isSelected = _selectedRole == role;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: GestureDetector(
        onTap: () => setState(() => _selectedRole = role),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.1) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isSelected ? color : const Color(0xFFE2E8F0), width: isSelected ? 2 : 1),
          ),
          child: Row(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                    Text(desc, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DynamicDashboardScreen extends StatefulWidget {
  final AppRole role;
  const DynamicDashboardScreen({Key? key, required this.role}) : super(key: key);

  @override
  State<DynamicDashboardScreen> createState() => _DynamicDashboardScreenState();
}

class _DynamicDashboardScreenState extends State<DynamicDashboardScreen> {
  String _activeMode = 'MANAGEMENT';

  @override
  Widget build(BuildContext context) {
    final hasInheritedFieldMode = [
      AppRole.agridoot,
      AppRole.talukaCoordinator,
      AppRole.districtCoordinator,
      AppRole.regionalManager
    ].contains(widget.role);

    return Scaffold(
      appBar: AppBar(
        title: Text('MAHA-AGRI: ${widget.role.toString().split('.').last.toUpperCase()}'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Mode Switcher (Seamless Field Mode vs Management Mode toggle)
            if (hasInheritedFieldMode && widget.role != AppRole.agridoot)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _activeMode = 'FIELD'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _activeMode == 'FIELD' ? const Color(0xFF059669) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: Text(
                              'Field Mode (MAHA-AGRIDOOT)',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _activeMode == 'FIELD' ? Colors.white : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _activeMode = 'MANAGEMENT'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _activeMode == 'MANAGEMENT' ? const Color(0xFF0F172A) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: Text(
                              'Management Mode',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _activeMode == 'MANAGEMENT' ? Colors.white : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Payment Verification Lock Alert Card
            if (widget.role == AppRole.soilChemist)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.lock, color: Color(0xFFDC2626)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Payment Verification Lock: Samples require fee verification before laboratory 12-parameter testing.',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF991B1B)),
                      ),
                    ),
                  ],
                ),
              ),

            // User Identity & Inherited Claims Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Mode: ${_activeMode.toUpperCase()}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 6),
                  const Text('Testing Agency Types Supported: Internal Govt, NABL Private, University & Section 8 NGO', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
