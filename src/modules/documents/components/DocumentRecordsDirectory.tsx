/**
 * Document Generation & Records Management System UI Component — Module 10 (DGRMS)
 * Location: /src/modules/documents/components/DocumentRecordsDirectory.tsx
 * Features:
 * - Template Catalog & Dynamic Merge Engine
 * - Digital Seal & QR Code Verification Engine
 * - Public Verification Registry & Anti-Fraud Revocation Tool
 * - Document Lifecycle State Machine (DRAFT -> ISSUED -> ARCHIVED)
 * - Bulk Generation Queue Manager
 */

import React, { useState } from 'react';
import {
  DocumentTemplate,
  DocumentRecord,
  VerificationRegistryRecord,
  BulkGenerationJob,
  DocumentLifecycleStatus
} from '../types/document.types';
import { DocumentGenerationRecordsService } from '../services/DocumentGenerationRecordsService';
import { FileText, ShieldCheck, QrCode, Search, Award, CheckCircle2, AlertTriangle, Layers, Lock, Download, RefreshCw, XCircle, FileSpreadsheet, Plus, ExternalLink } from 'lucide-react';

export const DocumentRecordsDirectory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ISSUED_DOCS' | 'TEMPLATES' | 'VERIFICATION_REGISTRY' | 'BULK_QUEUE'>('ISSUED_DOCS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);

  // Initial Document Templates Catalog
  const [templates] = useState<DocumentTemplate[]>([
    {
      id: 'tpl-1',
      templateCode: 'TPL-SOIL-REPORT',
      version: 'v1.0',
      title: 'Soil Sample Testing Technical Report Certificate',
      category: 'CERTIFICATE',
      contentTemplate: 'Official Technical Soil Test Report for farmer {{UPP_NAME}} (UPP ID: {{UPP_ID}}) residing in {{DISTRICT}} District. Soil PH Level: {{PH_LEVEL}}, Organic Carbon: {{ORGANIC_CARBON}}%. Status: VERIFIED & APPROVED.',
      placeholders: ['UPP_NAME', 'UPP_ID', 'DISTRICT', 'PH_LEVEL', 'ORGANIC_CARBON', 'DATE'],
      isActive: true,
    },
    {
      id: 'tpl-2',
      templateCode: 'TPL-SANCTION-ORDER',
      version: 'v1.0',
      title: 'Government Subsidy Sanction & Disbursal Order',
      category: 'SANCTION_ORDER',
      contentTemplate: 'Government Sanction Order for scheme {{SCHEME}} approving financial grant of ₹{{AMOUNT}} for beneficiary {{UPP_NAME}} under Request Code {{REQUEST_CODE}}.',
      placeholders: ['SCHEME', 'AMOUNT', 'UPP_NAME', 'REQUEST_CODE', 'DATE'],
      isActive: true,
    },
    {
      id: 'tpl-3',
      templateCode: 'TPL-FARMER-ID',
      version: 'v1.0',
      title: 'Universal MAHA-AGRI Farmer Digital Identity Card',
      category: 'ID_CARD',
      contentTemplate: 'Digital ID Card issued to {{UPP_NAME}} (Universal ID: {{UPP_ID}}). Registered District: {{DISTRICT}}.',
      placeholders: ['UPP_NAME', 'UPP_ID', 'DISTRICT'],
      isActive: true,
    },
  ]);

  // Initial Issued Documents Repository
  const [documents, setDocuments] = useState<DocumentRecord[]>([
    {
      id: 'doc-1',
      documentCode: 'DOC-2026-00912',
      templateCode: 'TPL-SOIL-REPORT',
      documentVersion: 'v1.0',
      ownerUppId: 'UPP-000000125',
      ownerName: 'Ankita Suresh Deshmukh',
      originModule: 'MISSION',
      originEntityId: 'MSN-2026-00048',
      lifecycleStatus: 'ISSUED',
      retentionYears: 10,
      mergedPayload: { UPP_NAME: 'Ankita Suresh Deshmukh', UPP_ID: 'UPP-000000125', DISTRICT: 'Wardha', PH_LEVEL: '6.8', ORGANIC_CARBON: '0.75' },
      seal: DocumentGenerationRecordsService.createDigitalSeal('DOC-2026-00912', 'Dept of Agriculture, Maharashtra'),
      issuedByName: 'Lab Director - Ramesh Patil',
      issuedAt: '2026-07-22T14:30:00Z',
    },
    {
      id: 'doc-2',
      documentCode: 'DOC-2026-00913',
      templateCode: 'TPL-SANCTION-ORDER',
      documentVersion: 'v1.0',
      ownerUppId: 'UPP-000000124',
      ownerName: 'Sunil Dattatray Patil',
      originModule: 'PAYMENTS',
      originEntityId: 'BATCH-2026-00048',
      lifecycleStatus: 'ISSUED',
      retentionYears: 10,
      mergedPayload: { SCHEME: 'Drone Spraying Subsidy', AMOUNT: '485000', UPP_NAME: 'Sunil Dattatray Patil', REQUEST_CODE: 'MA-REQ-000155' },
      seal: DocumentGenerationRecordsService.createDigitalSeal('DOC-2026-00913', 'Dept of Agriculture, Maharashtra'),
      issuedByName: 'State Disbursal Officer',
      issuedAt: '2026-07-22T16:00:00Z',
    },
  ]);

  // Initial Verification Registry
  const [registry, setRegistry] = useState<VerificationRegistryRecord[]>([
    {
      id: 'ver-1',
      documentCode: 'DOC-2026-00912',
      integrityHash: 'SHA256-a9b8c7d6e5-MAHA-AGRI-GOVT-STAMP',
      verificationUrl: 'https://verify.mahaagri.gov.in/doc/DOC-2026-00912',
      verificationStatus: 'VALID',
      verifiedCount: 14,
      issuedAt: '2026-07-22T14:30:00Z',
    },
    {
      id: 'ver-2',
      documentCode: 'DOC-2026-00913',
      integrityHash: 'SHA256-f1e2d3c4b5-MAHA-AGRI-GOVT-STAMP',
      verificationUrl: 'https://verify.mahaagri.gov.in/doc/DOC-2026-00913',
      verificationStatus: 'VALID',
      verifiedCount: 8,
      issuedAt: '2026-07-22T16:00:00Z',
    },
  ]);

  // Initial Bulk Queues
  const [bulkQueues, setBulkQueues] = useState<BulkGenerationJob[]>([
    {
      id: 'bulk-1',
      queueCode: 'QUEUE-2026-0081',
      batchName: 'Wardha Kharif Season Soil Report Certificates Batch',
      templateCode: 'TPL-SOIL-REPORT',
      totalDocuments: 5000,
      completedDocuments: 5000,
      status: 'COMPLETED',
      createdAt: '2026-07-21T10:00:00Z',
    },
  ]);

  const filteredDocuments = documents.filter(
    (d) =>
      d.documentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ownerUppId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateNewDocument = (template: DocumentTemplate) => {
    const { document, registryEntry } = DocumentGenerationRecordsService.issueDocument(
      template,
      'UPP-000000126',
      'Vikram Rajendra Shinde',
      'REQUESTS',
      'MA-REQ-000156',
      { UPP_NAME: 'Vikram Rajendra Shinde', UPP_ID: 'UPP-000000126', DISTRICT: 'Pune', PH_LEVEL: '7.1', ORGANIC_CARBON: '0.82', SCHEME: 'EDP Skill Grant', AMOUNT: '120000', REQUEST_CODE: 'MA-REQ-000156' },
      'Ramesh Patil'
    );

    setDocuments([document, ...documents]);
    setRegistry([registryEntry, ...registry]);
    alert(`Official Document ${document.documentCode} generated with Cryptographic Seal & QR Verification URL!`);
  };

  const handleRevokeDocument = (reg: VerificationRegistryRecord) => {
    const reason = prompt('Enter Document Revocation Reason (Anti-Fraud Action):');
    if (!reason) return;

    const revoked = DocumentGenerationRecordsService.revokeDocument(reg, reason);
    setRegistry(registry.map((r) => (r.id === reg.id ? revoked : r)));
    alert(`Document ${reg.documentCode} REVOKED in Public Verification Registry!`);
  };

  const handleArchiveDocument = (doc: DocumentRecord) => {
    const updated = DocumentGenerationRecordsService.transitionLifecycle(doc, 'ARCHIVED');
    setDocuments(documents.map((d) => (d.id === doc.id ? updated : d)));
    alert(`Document ${doc.documentCode} Archived safely in Records Vault!`);
  };

  return (
    <div className="space-y-6 text-xs text-slate-900">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-blue-600">
              Module 10: Document Generation & Records Management System (DGRMS)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
              v1.8.0-alpha Enterprise
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Document Generation & Public Verification Registry</h2>
          <p className="text-xs text-slate-500">
            Immutable Templates, Dynamic Data Merge, Digital Seal & QR Verification, Records Lifecycle & Anti-Fraud Registry
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Doc Code, UPP ID, Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Workspace Sub-Tabs */}
      <div className="flex border-b border-slate-200 font-bold text-xs">
        <button
          onClick={() => setActiveTab('ISSUED_DOCS')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'ISSUED_DOCS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Issued Official Documents Repository ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab('TEMPLATES')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'TEMPLATES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Template Catalog Engine ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('VERIFICATION_REGISTRY')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'VERIFICATION_REGISTRY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Public Verification Registry ({registry.length})
        </button>
        <button
          onClick={() => setActiveTab('BULK_QUEUE')}
          className={`px-4 py-2 border-b-2 transition-all ${
            activeTab === 'BULK_QUEUE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Bulk Generation Queue ({bulkQueues.length})
        </button>
      </div>

      {/* TAB 1: ISSUED OFFICIAL DOCUMENTS REPOSITORY */}
      {activeTab === 'ISSUED_DOCS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => {
            const tpl = templates.find((t) => t.templateCode === doc.templateCode);
            const renderedContent = tpl
              ? DocumentGenerationRecordsService.mergeTemplatePlaceholders(tpl.contentTemplate, doc.mergedPayload)
              : '';

            return (
              <div
                key={doc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm hover:shadow-md transition-all"
              >
                {/* Card Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                      {doc.documentCode}
                    </span>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold ml-1">
                      {doc.templateCode}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      doc.lifecycleStatus === 'ISSUED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {doc.lifecycleStatus}
                  </span>
                </div>

                {/* Owner & Merged Body */}
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900">{doc.ownerName}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Owner UPP: {doc.ownerUppId} • Origin: {doc.originModule}</p>
                  
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-sans text-xs text-slate-800 mt-2">
                    {renderedContent}
                  </div>
                </div>

                {/* Digital Seal & QR Preview */}
                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5 text-[10px] font-mono">
                    <p className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Digital Seal Verified
                    </p>
                    <p className="text-slate-300">ID: {doc.seal.uniqueDocumentId}</p>
                    <p className="text-slate-400 text-[9px] truncate max-w-[220px]">{doc.seal.verificationUrl}</p>
                  </div>

                  <img src={doc.seal.qrCodeUrl} alt="QR Code Seal" className="w-12 h-12 bg-white p-1 rounded-lg shrink-0" />
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Issued: {new Date(doc.issuedAt).toLocaleDateString()}</span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => alert(`Downloading official PDF for ${doc.documentCode}...`)}
                      className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg text-[10px] flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                    {doc.lifecycleStatus !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleArchiveDocument(doc)}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[10px]"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TEMPLATE CATALOG ENGINE */}
      {activeTab === 'TEMPLATES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {tpl.templateCode} ({tpl.version})
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
                  {tpl.category}
                </span>
              </div>

              <h3 className="text-sm font-extrabold text-slate-900">{tpl.title}</h3>
              
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700">
                {tpl.contentTemplate}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-mono">{tpl.placeholders.length} Placeholders</span>
                <button
                  onClick={() => handleGenerateNewDocument(tpl)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Issue Document</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PUBLIC VERIFICATION REGISTRY */}
      {activeTab === 'VERIFICATION_REGISTRY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Public Verification Registry & Anti-Fraud Directory</h3>
              <p className="text-xs text-slate-500">Public authenticity check & revocation registry for all official documents.</p>
            </div>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-bold border border-emerald-200">
              ANTI-FRAUD ACTIVE
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                  <th className="p-3">Document Code</th>
                  <th className="p-3">Integrity Hash</th>
                  <th className="p-3">Verification URL</th>
                  <th className="p-3">Public Status</th>
                  <th className="p-3 text-right font-mono">Verify Count</th>
                  <th className="p-3 text-right">Anti-Fraud Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {registry.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700">{r.documentCode}</td>
                    <td className="p-3 font-mono text-[10px] text-slate-600 truncate max-w-[180px]">{r.integrityHash}</td>
                    <td className="p-3 font-mono text-[10px] text-blue-600 flex items-center gap-1">
                      <a href={r.verificationUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                        {r.verificationUrl} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          r.verificationStatus === 'VALID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {r.verificationStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">{r.verifiedCount} Checks</td>
                    <td className="p-3 text-right">
                      {r.verificationStatus === 'VALID' && (
                        <button
                          onClick={() => handleRevokeDocument(r)}
                          className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg text-[10px] flex items-center gap-1 ml-auto"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Revoke Integrity</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BULK GENERATION QUEUE */}
      {activeTab === 'BULK_QUEUE' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Background Bulk Document Generation Queue</h3>
              <p className="text-xs text-slate-500">Automated background queue for mass certificate and report generation.</p>
            </div>
            <button
              onClick={() => {
                const job = DocumentGenerationRecordsService.queueBulkGeneration(
                  'Statewide Drone Spraying Subsidy Sanction Batch',
                  'TPL-SANCTION-ORDER',
                  10000
                );
                setBulkQueues([job, ...bulkQueues]);
              }}
              className="px-3.5 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Queue Mass Generation</span>
            </button>
          </div>

          <div className="space-y-3">
            {bulkQueues.map((q) => (
              <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                    {q.queueCode}
                  </span>
                  <h4 className="font-bold text-slate-900 mt-1">{q.batchName}</h4>
                  <p className="text-slate-500 text-[11px]">Template: {q.templateCode} • Total: {q.totalDocuments.toLocaleString()} Documents</p>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                    {q.status}
                  </span>
                  <p className="text-[11px] font-mono text-slate-600 font-bold">{q.completedDocuments.toLocaleString()} / {q.totalDocuments.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
