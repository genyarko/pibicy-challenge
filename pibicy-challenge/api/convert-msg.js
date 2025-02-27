// api/convert-msg.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Assume the client sends the annotated file data (for example, as base64)
        const { base64Data } = req.body;

        // Process base64Data here (replace with your conversion logic)
        const buffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', 'application/vnd.ms-outlook');
        res.setHeader('Content-Disposition', 'attachment; filename="converted.msg"');
        res.status(200).send(buffer);
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: 'Processing failed' });
    }
}
