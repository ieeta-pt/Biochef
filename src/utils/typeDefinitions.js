export const typeDefinitions = [
  {
    id: 'FASTA',
    validator: 'fasta',
    defaultExtension: '.fasta',
    scriptExtension: 'fa',
    uploadExtensions: ['.fasta', '.fa'],
    edgeColor: '#e74c3c',
    example: '>seq\nTTGCACTGACCTGAAGTCTTGGAGTATGACCGCGGCTCGGCTCTATCGAACGCTCGATCTAGCGCTATAGGTGGTGCCGAAGGCGGTCTGTCGTCGTA',
  },
  {
    id: 'Multi-FASTA',
    validator: 'multiFasta',
    defaultExtension: '.fasta',
    scriptExtension: 'fa',
    uploadExtensions: ['.fasta', '.fa'],
    edgeColor: '#d35400',
    example: '>seq1\nGTTCCAGTAGCGGCGTATCGTAGGTGACGTAGCAGTCGATCGCTAGCGAAGCGCTGACTAGCTCGATAGCGGCTACTCGTACGTAGTACGTAGCATACG\n>seq2\nAGCTGCTGATCGTGATCGAGCTCGATGCATCGATCGCTAGCGTACGTAGCTGACGTAGCGTGACTGATCGTAGCTGATCGTGACGTAGCTGACGTAGCTG',
  },
  {
    id: 'FASTQ',
    validator: 'fastq',
    defaultExtension: '.fastq',
    scriptExtension: 'fq',
    uploadExtensions: ['.fastq', '.fq'],
    edgeColor: '#e67e22',
    example: '@seq\nGCTAGCTGATCGTACGTAGCGTATCGTAGCTGATCGTACGATCGTAGCTAGCTGATCGTAGCTAGCTAGCTGATCGTAGCTAGCTGATCGTACGTAGC\n+\n!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~!!!!!',
  },
  {
    id: 'PackagedFASTQ',
    validator: 'packagedFastq',
    defaultExtension: '.txt',
    uploadExtensions: ['.txt'],
    edgeColor: '#2c3e50',
    example: 'GATTTGGGGTTCAAAGCAGTATCGATCAAATAGTAAATCCATTTGTTCAACTCACAGTTT\x7F!\'\'*((((***+))%%%++)(%%%%).1***-+*\'\'))**55CCF>>>>>>CCCCCCC6\x7FSEQ_ID\x7F+\x7F\t0',
  },
  {
    id: 'NUM',
    validator: 'num',
    defaultExtension: '.num',
    uploadExtensions: ['.num'],
    edgeColor: '#3498db',
    example: '0.123\n3.432\n2.341\n1.323\n7.538\n4.122\n0.242\n0.654\n5.633',
  },
  {
    id: 'BIN',
    validator: 'bin',
    defaultExtension: '.bin',
    uploadExtensions: ['.bin'],
    edgeColor: '#123456',
    example: '0\n1\n0',
  },
  {
    id: 'DNA',
    validator: 'dna',
    defaultExtension: '.txt',
    uploadExtensions: ['.txt'],
    edgeColor: '#9b59b6',
    example: 'CGTACGTAGCTGACTGATCGTAGCTAGCTGACTGACTAGCTGATCGTAGCTGATCGTACGTAGCTAGCTAGCTGACTAGCTGATCGTACGTAGCTGAC',
  },
  {
    id: 'RNA',
    validator: 'rna',
    defaultExtension: '.txt',
    uploadExtensions: ['.txt'],
    edgeColor: '#8e44ad',
    example: 'CGUACGUAGCUGACUGAUCGAUGCUACGUAGCUGACGUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUA',
  },
  {
    id: 'AminoAcids',
    validator: 'aminoAcids',
    defaultExtension: '.txt',
    uploadExtensions: ['.txt'],
    edgeColor: '#16a085',
    example: 'ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTV',
  },
   {
    id: 'POS',
    validator: 'pos',
    defaultExtension: '.pos',
    uploadExtensions: ['.pos'],
    edgeColor: '#7f8c8d',
    example: '1 10\n2 20',
  },
  {
    id: 'SVG',
    validator: 'svg',
    defaultExtension: '.svg',
    uploadExtensions: ['.svg'],
    edgeColor: '#27ae60',
    example: '<svg width=\'100\' height=\'100\'><rect width=\'100\' height=\'100\' style=\'fill:rgb(0,0,255);stroke-width:3;stroke:rgb(0,0,0)\' /></svg>',
  },
  {
    id: 'Group',
    validator: 'group',
    defaultExtension: '.txt',
    uploadExtensions: ['.txt'],
    edgeColor: '#34495e',
    example: 'PNUSH*X',
  },
  {
    id: 'BED',
    validator: 'bed',
    defaultExtension: '.bed',
    uploadExtensions: ['.bed'],
    edgeColor: '#f1c40f',
    example: 'seq\t0\t10\nseq1\t0\t20',
  },
  {
    id: 'LIST',
    validator: 'list',
    defaultExtension: '.lst',
    uploadExtensions: ['.lst', '.list'],
    edgeColor: '#7f8c8d',
    example: 'seq\nseq1\nseq2',
  },
  {
    id: 'TEXT',
    validator: 'text',
    defaultExtension: '.txt',
    uploadExtensions: ['.txt'],
    edgeColor: '#2ecc71',
    example: 'Hello, World',
  },
];

export function getTypeDefinitions() {
  return typeDefinitions;
}

export function getTypeDefinition(typeId) {
  return typeDefinitions.find(typeDef => typeDef.id === typeId);
}

export function getUploadExtensions() {
  return [...new Set(typeDefinitions.flatMap(typeDef => typeDef.uploadExtensions || []))];
}

export function getDefaultExtension(typeId) {
  return getTypeDefinition(typeId)?.defaultExtension || '.txt';
}

export function getScriptExtension(typeId) {
  return getTypeDefinition(typeId)?.scriptExtension || getDefaultExtension(typeId).replace(/^\./, '');
}

export function getTypeExampleInput(typeId) {
  return getTypeDefinition(typeId)?.example || '';
}

export function getAllTypeExampleInputs() {
  return Object.fromEntries(
    typeDefinitions
      .filter(typeDef => typeDef.example)
      .map(typeDef => [typeDef.id, typeDef.example])
  );
}

export function getEdgeColor(typeId) {
  return getTypeDefinition(typeId)?.edgeColor || '#999';
}
