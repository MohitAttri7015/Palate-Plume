// Runs in the BROWSER. Uploads one picture straight to ImageKit.
// Steps: 1) ask our server for a permission slip, 2) send the picture to ImageKit with that slip.
// Shrinks big phone photos (often 3-8 MB) to a ~1600px WebP before upload.
// If anything goes wrong we just upload the original file.
async function shrink(file) {
    try {
        if (!file.type.startsWith("image/") || file.size < 300 * 1024) return file;
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
    } catch {
        return file;
    }
}

export async function uploadImage(originalFile) {
    // Resize and ask for the permission slip at the same time
    const filePromise = shrink(originalFile);
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
    let file = await filePromise;
    if (/\.jfif$/i.test(file.name)) {
        file = new File([file], file.name.replace(/\.jfif$/i, ".jpg"), { type: "image/jpeg" });
    }
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