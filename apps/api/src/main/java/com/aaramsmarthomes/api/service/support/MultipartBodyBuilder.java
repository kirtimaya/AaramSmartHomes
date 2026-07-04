package com.aaramsmarthomes.api.service.support;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Hand-rolled multipart/form-data body builder. Used by MediaService (WhatsApp
 * media upload) and SttService (Groq transcription) — both need to POST a
 * mix of text fields plus one file field, and pulling in a multipart library
 * for ~30 lines of well-understood format isn't worth the dependency.
 */
public final class MultipartBodyBuilder {

    private MultipartBodyBuilder() {}

    public record TextField(String name, String value) {}

    public static byte[] build(String boundary, List<TextField> textFields, String fileFieldName,
                                String filename, String fileMimeType, byte[] fileBytes) {
        String crlf = "\r\n";
        List<byte[]> parts = new ArrayList<>();

        for (TextField field : textFields) {
            parts.add(("--" + boundary + crlf
                + "Content-Disposition: form-data; name=\"" + field.name() + "\"" + crlf + crlf
                + field.value() + crlf).getBytes(StandardCharsets.UTF_8));
        }

        parts.add(("--" + boundary + crlf
            + "Content-Disposition: form-data; name=\"" + fileFieldName + "\"; filename=\"" + filename + "\"" + crlf
            + "Content-Type: " + fileMimeType + crlf + crlf).getBytes(StandardCharsets.UTF_8));
        parts.add(fileBytes);
        parts.add(crlf.getBytes(StandardCharsets.UTF_8));

        parts.add(("--" + boundary + "--" + crlf).getBytes(StandardCharsets.UTF_8));

        int totalLength = parts.stream().mapToInt(p -> p.length).sum();
        byte[] result = new byte[totalLength];
        int offset = 0;
        for (byte[] part : parts) {
            System.arraycopy(part, 0, result, offset, part.length);
            offset += part.length;
        }
        return result;
    }
}
