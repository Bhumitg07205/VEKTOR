async function test() {
  const formData = new FormData();
  const blob = new Blob(["dummy pdf content"], { type: "application/pdf" });
  formData.append('file', blob, "test.pdf");
  formData.append('upload_preset', 'ml_default');

  const res = await fetch('https://api.cloudinary.com/v1_1/dxnmrhhmt/auto/upload', {
    method: 'POST',
    body: formData
  });
  
  const text = await res.text();
  console.log(res.status, text);
}
test();
