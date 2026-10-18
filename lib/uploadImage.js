// Runs in the BROWSER. Uploads one picture straight to ImageKit.
// Steps: 1) ask our server for a permission slip, 2) send the picture to ImageKit with that slip.
export async function uploadImage(file) {
    // 1) Permission slip from our own server
    let auth;
    try {
        const res = await fetch("/api/admin/uploads/sign", { method: "POST" });
        auth = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(auth.error || "Could not get permission to upload. Please try again.");
    } catch (err) {
        if (err instanceof TypeError) throw new Error("Can't reach the server. Check your internet connection and try again.");
        throw err;
    }

    // 2) Send the picture to ImageKit
    const form = new FormData();
    form.append("file", file);
    form.append("fileName", file.name);
    form.append("publicKey", auth.publicKey);
    form.append("signature", auth.signature);
    form.append("expire", String(auth.expire));
    form.append("token", auth.token);
    form.append("folder", auth.folder);
    form.append("useUniqueFileName", "true"); // ImageKit adds random letters so two files never clash

    let res;
    try {
        res = await fetch(auth.uploadUrl, { method: "POST", body: form });
    } catch {
        throw new Error("Could not reach the picture storage. Check your internet connection and try again.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "The picture could not be uploaded. Please try again.");

    return { url: data.url, fileId: data.fileId, name: data.name };
}