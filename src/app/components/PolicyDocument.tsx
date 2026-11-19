// Structure for a future server-provided, approved policy document.
// No policy content/version is invented, and no legal acceptance is activated here.
export interface ApprovedPolicyDocument {
  version:string;
  title:string;
  approvedAt:string;
  approvedBy:string;
  contentSha256:string;
  sections:ReadonlyArray<{heading:string;paragraphs:ReadonlyArray<string>}>;
}
export function PolicyDocument({document}: {document?:ApprovedPolicyDocument}) {
  if(!document)return <section aria-label="Status dokumen kebijakan"><p>Syarat dan ketentuan resmi belum disahkan; halaman ini bukan persetujuan legal kampus.</p><p className="text-xs text-slate-600">Versi dan dokumen kebijakan resmi belum tersedia. Konfirmasi informatif pengajuan di bawah dicatat terpisah.</p></section>;
  return <article aria-label="Dokumen kebijakan" className="space-y-3">
    <h3 className="font-semibold">{document.title}</h3>
    <p>Versi {document.version} · disahkan {document.approvedAt} oleh {document.approvedBy}</p>
    {document.sections.map((section,index)=><section key={index}><h4 className="font-semibold">{section.heading}</h4>{section.paragraphs.map((paragraph,i)=><p key={i} className="whitespace-pre-wrap">{paragraph}</p>)}</section>)}
    <p className="text-xs break-all">SHA-256 dokumen: {document.contentSha256}</p>
  </article>;
}
