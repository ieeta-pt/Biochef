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
    id: 'EFA',
    validator: 'efa',
    defaultExtension: '.efa',
    scriptExtension: 'efa',
    uploadExtensions: ['.efa'],
    edgeColor: '#f06000',
    example: '<none.1\n>alpha\nACGTACGTACGTACGT\n>beta\nACGTACGTTCGTACGT\n>gamma\nACGTACGTACGTTCGT\n<abc.1\n>alpha\nACGTACGTACGTACGT\n>beta\nACGTACGTTCGTACGT\n>gamma\nACGTACGTACGTTCGT',
  },
  {
    id: 'FASTQ',
    validator: 'fastq',
    defaultExtension: '.fastq',
    scriptExtension: 'fq',
    uploadExtensions: ['.fastq', '.fq'],
    edgeColor: '#e67e22',
    example: '@seq\nGCTAGCTGATCGTACGTAGCGTATCGTAGCTGATCGTACGATCGTAGCTAGCTGATCGTAGCTAGCTAGCTGATCGTAGCTAGCTGATCGTACGTAGCC\n+\n!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~!!!!!',
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
    id: 'GFF',
    validator: 'gff',
    defaultExtension: '.gff',
    scriptExtension: 'gff',
    uploadExtensions: ['.gff', '.gff3', '.gtf'],
    edgeColor: '#1abc9c',
    example: 'seq\t.\tgene\t1\t30\t.\t+\t.\tID=gene1\nseq\t.\tmRNA\t1\t30\t.\t+\t.\tID=tx1;Parent=gene1\nseq\t.\texon\t1\t30\t.\t+\t.\tParent=tx1\nseq\t.\tCDS\t1\t30\t.\t+\t0\tParent=tx1',
  },
  {
    id: 'VCF',
    validator: 'vcf',
    defaultExtension: '.vcf',
    scriptExtension: 'vcf',
    uploadExtensions: ['.vcf'],
    edgeColor: '#6c5ce7',
    example: '##fileformat=VCFv4.2\n##contig=<ID=chr1,length=1000000>\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\nchr1\t11\t.\tA\tG\t42\tPASS\t.\nchr1\t36\t.\tT\tC\t18\tPASS\t.',
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
    id: 'JSON',
    validator: 'json',
    defaultExtension: '.json',
    scriptExtension: 'json',
    uploadExtensions: ['.json', '.jsonl'],
    edgeColor: '#415b54',
    example: '{"samples":[{"id":"sample_1","condition":"control","value":12.5},{"id":"sample_2","condition":"treated","value":18.2}],"metadata":{"organism":"example","assay":"measurement"}}',
  },
  {
    id: 'TEXT',
    validator: 'text',
    defaultExtension: '.txt',
    uploadExtensions: ['.txt'],
    edgeColor: '#2ecc71',
    example: 'Hello, World',
  },
  {
    id: 'BAM',
    validator: 'bam',
    defaultExtension: '.bam',
    uploadExtensions: ['.bam'],
    edgeColor: '#9dce32',
    format: 'binary'
  },
  {
    id: 'BAI',
    validator: 'bai',
    defaultExtension: '.bai',
    uploadExtensions: ['.bai'],
    edgeColor: '#ce32c1',
    format: 'binary'
  },
  {
    id: 'MMI',
    validator: 'mmi',
    defaultExtension: '.mmi',
    uploadExtensions: ['.mmi'],
    edgeColor: '#c7ba43',
    format: 'binary'
  },
  {
    id: 'CSI',
    validator: 'csi',
    defaultExtension: '.csi',
    uploadExtensions: ['.csi'],
    edgeColor: '#c75743',
    format: 'binary'
  },
  {
    id: 'BCF',
    validator: 'bcf',
    defaultExtension: '.bcf',
    uploadExtensions: ['.bcf'],
    edgeColor: '#059400',
    format: 'binary'
  },
  {
    id: 'FAI',
    validator: 'fai',
    defaultExtension: '.fai',
    uploadExtensions: ['.fai'],
    edgeColor: '#77016d',
  },
  {
    id: 'CRAM',
    validator: 'cram',
    defaultExtension: '.cram',
    uploadExtensions: ['.cram'],
    edgeColor: '#3b5502',
    format: 'binary'
  },
  {
    id: 'SAM',
    validator: 'sam',
    defaultExtension: '.sam',
    uploadExtensions: ['.sam'],
    edgeColor: '#1aa3fd',
    example: '@SQ	SN:ref	LN:45\n@SQ	SN:ref2	LN:40\nr001	163	ref	7	30	8M4I4M1D3M	=	37	39	TTAGATAAAGAGGATACTG	*	XX:B:S,12561,2,20,112\nr002	0	ref	9	30	1S2I6M1P1I1P1I4M2I	*	0	0	AAAAGATAAGGGATAAA	*\nr003	0	ref	9	30	5H6M	*	0	0	AGCTAA	*\nr004	0	ref	16	30	6M14N1I5M	*	0	0	ATAGCTCTCAGC	*\nr003	16	ref	29	30	6H5M	*	0	0	TAGGC	*\nr001	83	ref	37	30	9M	=	7	-39	CAGCGCCAT	*\nx1	0	ref2	1	30	20M	*	0	0	aggttttataaaacaaataa	????????????????????\nx2	0	ref2	2	30	21M	*	0	0	ggttttataaaacaaataatt	?????????????????????\nx3	0	ref2	6	30	9M4I13M	*	0	0	ttataaaacAAATaattaagtctaca	??????????????????????????\nx4	0	ref2	10	30	25M	*	0	0	CaaaTaattaagtctacagagcaac	?????????????????????????\nx5	0	ref2	12	30	24M	*	0	0	aaTaattaagtctacagagcaact	????????????????????????\nx6	0	ref2	14	30	23M	*	0	0	Taattaagtctacagagcaacta	???????????????????????',
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

export function getBinaryUploadExtensions() {
  return [...new Set(typeDefinitions.flatMap(typeDef => typeDef.format === "binary" ? (typeDef.uploadExtensions || []) : []))];
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

const defaultEdgeColor = '#999'

export function getDefaultEdgeColor() {
  return defaultEdgeColor;
}

export function getEdgeColor(typeId) {
  return getTypeDefinition(typeId)?.edgeColor || defaultEdgeColor;
}

export function isTypeBinary(typeId) {
  return getTypeDefinition(typeId)?.format == "binary"
}
