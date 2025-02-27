export default async function handler(req, res) {
    console.log("Request method:", req.method);
    console.log("Request body:", req.body);

    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    try {
        const { base64Data } = req.body;
        if (!base64Data) {
            console.error("No base64Data provided");
            res.status(400).json({ error: "No base64Data provided" });
            return;
        }

        // Build a simple EML message with the image embedded.
        const emlContent = [
            "Subject: Annotated Message",
            "From: example@example.com",
            "To: example@example.com",
            "MIME-Version: 1.0",
            'Content-Type: multipart/related; boundary="BOUNDARY"',
            "",
            "--BOUNDARY",
            'Content-Type: text/html; charset="UTF-8"',
            "",
            '<html><body><img src="cid:annotated-image" /></body></html>',
            "",
            "--BOUNDARY",
            "Content-Type: image/png",
            "Content-Transfer-Encoding: base64",
            "Content-ID: <annotated-image>",
            "",
            base64Data,
            "--BOUNDARY--"
        ].join("\r\n");

        console.log("EML content created:", emlContent.substring(0, 100) + "...");

        const buffer = Buffer.from(emlContent, "utf8");
        res.setHeader("Content-Type", "message/rfc822");
        res.setHeader("Content-Disposition", 'attachment; filename="annotated.eml"');
        res.status(200).send(buffer);
    } catch (error) {
        console.error("Error in convert-msg API:", error);
        res.status(500).json({ error: "Server error" });
    }
}
