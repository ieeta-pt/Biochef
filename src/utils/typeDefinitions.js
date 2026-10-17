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
    example: '>seq1_human\nTTGATCCTTAATTGCGGCTTCGATTACTAAAAAACAGGGACAGCATCAACCAAACTGCTTACATTACTGTCGGCGCAACAGCGCGGAAACCGGTTGTTAA\n>seq2_cat\nTTGACCCTTAACTGCGGCTTCAATTACTAATAAACAGGGAAAGCATTACCCAAACTGCTTACATTACTGTCGGCGCAACAGCGCCGCAACCGATTGTTAA\n>seq3_mouse\nCTGACGTTTAAATGCGGCTGGAATTATTCAAAAACTGGTGAAGCATTTCCCAAGTTGCTTCCATTACAGTCTGCGGAACAGCGTCGAGAGCGATCGTAAA\n>seq4_dog\nCTGACGTCGAAATGCGGCTAGTATGATTAAAGAACTGGTAAAGCATTACCCAAATTGCTTCCATTACAGTCTGCGGAACAGCGTCGAAATCGATCGTAAA',
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
    example: '@read1\nGCTAAAGACAATTACATAACATACACGTCAGCACGAAACTTGTTGGCCCAGTGTGAATCGCTTAAGGGTTAAGTAAGTGT\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read2\nGCACGAAACTTGTTGGCCCAGTGTGAATCGCTTAAGGGTTAAGTAAGTGTGATGCATACGCCTTTACTTGCTGTGTCCAC\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read3\nCTTAAGGGTTAAGTAAGTGTGATGCATACGCCTTTACTTGCTGTGTCCACCCCATCGGACTGGCATTTTTATTACACTCA\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read4\nCCTTTACTTGCTGTGTCCACCCCATCGGACTGGCATTTTTATTACACTCAGAAACAGAACTCGGGTAATTTTGACAGGTC\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read5\nTGGCATTTTTATTACACTCAGAAACAGAACTCGGGTAATTTTGACAGGTCACGCAGAGGCGCGCCCTCCTGAAGTGCGTG\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\n@read6\nTCGGGTAATTTTGACAGGTCACGCAGAGGCGCGCCCTCCTGAAGTGCGTGGACACTCGCTATGAATCTCTGATTTACCCA\n+\nIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
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
    example: '##fileformat=VCFv4.2\n##contig=<ID=seq,length=98>\n##FILTER=<ID=PASS,Description="All filters passed">\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tsample\nseq\t10\t.\tC\tA\t60\tPASS\t.\tGT\t0/1',
  },
  {
    id: 'PSMC',
    validator: 'psmc',
    defaultExtension: '.psmc',
    uploadExtensions: ['.psmc'],
    edgeColor: '#546e7a',
    example: 'CC\nCC\tBrief Description of the file format:\nCC\t  CC  comments\nCC\t  MM  useful-messages\nCC\t  RD  round-of-iterations\nCC\t  LL  \\log[P(sequence)]\nCC\t  QD  Q-before-opt Q-after-opt\nCC\t  TR  \\theta_0 \\rho_0\nCC\t  RS  k t_k \\lambda_k \\pi_k \\sum_{l\\not=k}A_{kl} A_{kk}\nCC\t  DC  begin end best-k t_k+\\Delta_k max-prob\nCC\nMM\tVersion: 0.6.5-r74-dirty\nMM\tpattern:1+1+1+1, n:3, n_free_lambdas:4\nMM\tn_iterations:1, skip:1, max_t:15, theta/rho:4\nMM\tis_decoding:0\nMM\tn_seqs:1, sum_L:65, sum_n:3\nRD\t0\nLK\t0.000000\nQD\t0.000000 -> 0.000000\nRI\tinf\nTR\t0.047253\t0.011813\nMT\t15.000000\nMM\tC_pi: 1.000000, n_recomb: 0.763351\nRS\t0\t0.000000\t1.000000\t0.266770\t0.349472\t0.000000\nRS\t1\t0.432507\t1.000000\t0.446281\t0.584634\t0.000000\nRS\t2\t2.735641\t1.000000\t0.050300\t0.065894\t0.000000\nRS\t3\t15.000000\t1.000000\t0.000000\t0.000000\t0.000000\nPA\t1+1+1+1 0.047252885 0.011813221 15.000000000 1.000000000 1.000000000 1.000000000 1.000000000\n//\nIT\t50008\nRD\t1\nLK\t-12.748373\nQD\t-0.304372 -> -0.072240\nRI\t0.0011439472\nTR\t1.418623\t0.775098\nMT\t0.104141\nMM\tC_pi: 0.034110, n_recomb: 1.696070\nRS\t0\t0.000000\t0.440567\t0.099501\t0.058666\t0.068804\nRS\t1\t0.026856\t0.008736\t1.563930\t0.922091\t0.915310\nRS\t2\t0.060924\t0.000175\t0.032638\t0.019244\t0.015886\nRS\t3\t0.104141\t0.033600\t0.000000\t0.000000\t0.000000\nPA\t1+1+1+1 1.418623375 0.775097807 0.104141235 0.440567017 0.008735657 0.000175476 0.033599854\n//',
  },
  {
    id: 'PSMC_PARAMS',
    validator: 'psmcParams',
    defaultExtension: '.par',
    uploadExtensions: ['.par'],
    edgeColor: '#78909c',
    example: '4+5*3+4 0.274400271 0.007093592 2.260467171 1685167.091007381 0.098469252 76061.673035966 3.400960683 0.033475147 0.001966313 0.001944450',
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
    id: 'BIGBED',
    validator: 'bigbed',
    defaultExtension: '.bb',
    uploadExtensions: ['.bb', '.bigbed'],
    edgeColor: '#8d6e63',
    format: 'binary'
  },
  {
    id: 'BIGWIG',
    validator: 'bigwig',
    defaultExtension: '.bw',
    uploadExtensions: ['.bw', '.bigwig'],
    edgeColor: '#5c6bc0',
    format: 'binary'
  },
  {
    id: 'FMD',
    validator: 'fmd',
    defaultExtension: '.fmd',
    uploadExtensions: ['.fmd'],
    edgeColor: '#6d4c41',
    format: 'binary'
  },
  {
    id: 'PSMC_CPG',
    validator: 'psmcCpg',
    defaultExtension: '.cpg',
    uploadExtensions: ['.cpg'],
    edgeColor: '#a1887f',
    format: 'binary'
  },
  {
    id: 'GTF',
    validator: 'gtf',
    defaultExtension: '.gtf',
    uploadExtensions: ['.gtf'],
    edgeColor: '#ab47bc',
    example: 'seq\tStringTie\ttranscript\t1\t30\t1000\t+\t.\tgene_id "gene1"; transcript_id "tx1"; FPKM "12.34";\nseq\tStringTie\texon\t1\t30\t1000\t+\t.\tgene_id "gene1"; transcript_id "tx1"; exon_number "1";',
  },
  {
    id: 'PAF',
    validator: 'paf',
    defaultExtension: '.paf',
    uploadExtensions: ['.paf'],
    edgeColor: '#26a69a',
    example: 'queryA\t500\t10\t490\t+\ttargetA\t1000\t100\t580\t470\t480\t60\nqueryB\t300\t0\t300\t-\ttargetA\t1000\t650\t950\t290\t300\t60',
  },
  {
    id: 'GFA',
    validator: 'gfa',
    defaultExtension: '.gfa',
    uploadExtensions: ['.gfa'],
    edgeColor: '#ef6c00',
    example: 'H\tVN:Z:1.0\nS\ts1\tACGTACGTACGT\nS\ts2\tTTACGTACGTAC\nL\ts1\t+\ts2\t+\t4M\nP\tp1\ts1+,s2+\t*',
  },
  {
    id: 'CLUSTAL',
    validator: 'clustal',
    defaultExtension: '.aln',
    uploadExtensions: ['.aln', '.clustal', '.clw'],
    edgeColor: '#7cb342',
    example: 'CLUSTAL format alignment by MAFFT (v7.526)\n\n\nseq1            ACGTACGTAC-GTACGT\nseq2            ACGTACGAACTGTACGT\nseq3            ACGTACGTAC-GTACGA\n                ******* ** ***** \n',
  },
  {
    id: 'SND',
    validator: 'snd',
    defaultExtension: '.snd',
    uploadExtensions: ['.snd'],
    edgeColor: '#ec407a',
    example: '#sample\tgene1\tgene2\tgene3\ncellA\t0.95\t0\t1.2\ncellB\t0\t0.31\t0.8\ncellC\t1.1\t0.07\t0',
  },
  {
    id: 'SAM',
    validator: 'sam',
    defaultExtension: '.sam',
    uploadExtensions: ['.sam'],
    edgeColor: '#1aa3fd',
    example: '@HD\tVN:1.6\tSO:queryname\n@SQ\tSN:seq\tLN:98\nread1\t99\tseq\t1\t60\t40M\t=\t59\t98\tTTGCACTGACCTGAAGTCTTGGAGTATGACCGCGGCTCGG\tIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII\nread1\t147\tseq\t59\t60\t40M\t=\t1\t-98\tCTAGCGCTATAGGTGGTGCCGAAGGCGGTCTGTCGTCGTA\tIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
  },
  {
    id: 'NEWICK',
    validator: 'newick',
    defaultExtension: '.nw',
    scriptExtension: 'nw',
    uploadExtensions: ['.nw', '.newick', '.tre', '.tree'],
    edgeColor: '#00897b',
    example: '((A:0.1,B:0.1)100:0.2,(C:0.1,D:0.1)100:0.2);\n((A:0.2,B:0.2)95:0.3,(C:0.2,D:0.2)95:0.3);\n((A:0.3,C:0.3)90:0.4,(B:0.3,D:0.3)90:0.4);',
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
