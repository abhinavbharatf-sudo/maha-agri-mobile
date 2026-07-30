// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Flutter Mobile App: Clean Architecture Home Page & 15 Modules Navigation
// ============================================================================

import 'package:flutter/material.dart';

class MahaAgriHomePage extends StatefulWidget {
  const MahaAgriHomePage({super.key});

  @override
  State<MahaAgriHomePage> createState() => _MahaAgriHomePageState();
}

class _MahaAgriHomePageState extends State<MahaAgriHomePage> {
  int _selectedIndex = 0;
  String _selectedRole = 'MAHA_AGRIDOOT';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 2,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'म',
                style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'MAHA-AGRI MOBILE',
                  style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Govt Digital Operations v1.0',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                ),
              ],
            ),
          ],
        ),
        actions: [
          DropdownButton<String>(
            value: _selectedRole,
            dropdownColor: const Color(0xFF1E293B),
            underline: const SizedBox(),
            icon: const Icon(Icons.security, color: Color(0xFF34D399), size: 18),
            items: const [
              DropdownMenuItem(value: 'SUPER_ADMIN', child: Text('Super Admin', style: TextStyle(color: Colors.white, fontSize: 11))),
              DropdownMenuItem(value: 'MAHA_AGRIDOOT', child: Text('MAHA-AGRIDOOT', style: TextStyle(color: Colors.white, fontSize: 11))),
              DropdownMenuItem(value: 'LAB_TECHNICIAN', child: Text('Lab Technician', style: TextStyle(color: Colors.white, fontSize: 11))),
              DropdownMenuItem(value: 'DRONE_PILOT', child: Text('Drone Pilot', style: TextStyle(color: Colors.white, fontSize: 11))),
              DropdownMenuItem(value: 'ENTREPRENEUR', child: Text('Entrepreneur POS', style: TextStyle(color: Colors.white, fontSize: 11))),
            ],
            onChanged: (val) {
              if (val != null) setState(() => _selectedRole = val);
            },
          ),
          const SizedBox(width: 10),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildFieldDashboard(),
          _buildSoilCollectionModule(),
          _buildOfflineSyncModule(),
          _buildGisMapModule(),
          _buildProfileModule(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF0F766E),
        unselectedItemColor: const Color(0xFF64748B),
        selectedFontSize: 10,
        unselectedFontSize: 10,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.qr_code_scanner), label: 'QR Collector'),
          BottomNavigationBarItem(icon: Icon(Icons.sync), label: 'Offline Sync'),
          BottomNavigationBarItem(icon: Icon(Icons.map_outlined), label: 'GIS Survey'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }

  // Module 01 & 14: Executive Field Dashboard
  Widget _buildFieldDashboard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Offline Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: Row(
              children: const [
                Icon(Icons.wifi_off_rounded, size: 18, color: Color(0xFF059669)),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Offline Engine Active: 14 Local Records Queued for Sync',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF065F46)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          const Text(
            'Field Operations Summary',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 12),

          // Quick Action Modules Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.4,
            children: [
              _buildModuleCard('03. Register Farmer', 'Field Registration', Icons.person_add_alt_1, Colors.blue),
              _buildModuleCard('04. Soil Sample QR', 'Scan & Collect', Icons.qr_code_scanner, Colors.emerald),
              _buildModuleCard('07. Drone Spraying', 'Flight Execution', Icons.flight_takeoff, Colors.purple),
              _buildModuleCard('06. Entrepreneur POS', 'Inventory & Sales', Icons.storefront, Colors.amber),
            ],
          ),
          const SizedBox(height: 20),

          // Recent Activity Card
          const Text(
            'Recent Field Collections',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 8),

          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFD1FAE5),
                child: Icon(Icons.science, color: Color(0xFF059669)),
              ),
              title: const Text('Sample: MA-REQ-000155', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('Farmer: Ramesh Patil | GPS: 20.7453, 78.6022', style: TextStyle(fontSize: 11)),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFDBEAFE), borderRadius: BorderRadius.circular(6)),
                child: const Text('QUEUED SYNC', style: TextStyle(color: Color(0xFF1E40AF), fontSize: 9, fontWeight: FontWeight.bold)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Module 04: Soil Sample QR Collector
  Widget _buildSoilCollectionModule() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: const Color(0xFFECFDF5), shape: BoxShape.circle),
            child: const Icon(Icons.qr_code_scanner, size: 64, color: Color(0xFF059669)),
          ),
          const SizedBox(height: 20),
          const Text(
            'Soil Sample QR Collector',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 8),
          const Text(
            'Scan sample bag QR code, capture GPS coordinates, and attach farmer signature.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.camera_alt),
            label: const Text('Open QR Scanner & Camera'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F766E),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }

  // Module 02: Offline Synchronization Module
  Widget _buildOfflineSyncModule() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Offline SQLite Synchronization Engine',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text('Local cache database powered by optimistic locking record_version', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          const SizedBox(height: 16),

          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
            child: Column(
              children: const [
                ListTile(
                  leading: Icon(Icons.storage, color: Color(0xFF0F766E)),
                  title: Text('Maharashtra Master Geography', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  subtitle: Text('36 Districts, 358 Talukas cached locally', style: TextStyle(fontSize: 10)),
                  trailing: Icon(Icons.check_circle, color: Colors.emerald, size: 20),
                ),
                Divider(height: 1),
                ListTile(
                  leading: Icon(Icons.cloud_upload_outlined, color: Color(0xFF2563EB)),
                  title: Text('Pending Field Requests Outbox', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  subtitle: Text('14 records waiting for auto-sync', style: TextStyle(fontSize: 10)),
                  trailing: Text('14 QUEUED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Module 15: PostGIS Mobile GIS Surveyor
  Widget _buildGisMapModule() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.map, size: 56, color: Color(0xFF0F766E)),
          SizedBox(height: 12),
          Text('PostGIS Mobile GIS Surveyor', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          SizedBox(height: 6),
          Text('Survey Gat land parcel polygon mapping & drone lines', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
        ],
      ),
    );
  }

  Widget _buildProfileModule() {
    return const Center(
      child: Text('User Profile & RBAC Security Settings', style: TextStyle(fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildModuleCard(String title, String subtitle, IconData icon, Colors) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: const Color(0xFF0F766E), size: 24),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF0F172A))),
          Text(subtitle, style: const TextStyle(fontSize: 9, color: Color(0xFF64748B))),
        ],
      ),
    );
  }
}
