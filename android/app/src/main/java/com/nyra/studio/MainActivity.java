package com.nyra.studio;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class MainActivity extends Activity {
    private static final int CREATE_DOCUMENT_REQUEST = 4207;
    private static final long MAX_EXPORT_BYTES = 64L * 1024L * 1024L;

    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private final Map<String, ExportTransfer> transfers = new ConcurrentHashMap<>();
    private final Queue<ExportTransfer> completedExports = new ArrayDeque<>();
    private ExportTransfer pendingDocument;
    private boolean documentPickerOpen;

    private static final class ExportTransfer {
        final String name;
        final String mime;
        final File file;
        long bytes;

        ExportTransfer(String name, String mime, File file) {
            this.name = name;
            this.mime = mime;
            this.file = file;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.addJavascriptInterface(new ExportBridge(), "NyraAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
                Toast.makeText(this, "Esse tipo de arquivo precisa ser exportado pelo botão do editor.", Toast.LENGTH_LONG).show();
                return;
            }
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setTitle("Nyra 3D Studio");
                request.setDescription("Baixando arquivo externo");
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeFilename(contentDisposition, "nyra-download"));
                String cookies = android.webkit.CookieManager.getInstance().getCookie(url);
                if (cookies != null) request.addRequestHeader("Cookie", cookies);
                request.addRequestHeader("User-Agent", userAgent == null ? "Nyra 3D Studio" : userAgent);
                DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (manager != null) {
                    manager.enqueue(request);
                    Toast.makeText(this, "Download iniciado. Confira a pasta Downloads.", Toast.LENGTH_LONG).show();
                }
            } catch (Exception ex) {
                Toast.makeText(this, "Não foi possível iniciar o download: " + ex.getMessage(), Toast.LENGTH_LONG).show();
            }
        });

        root.addView(webView);
        setContentView(root);
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
    }

    private static String safeFilename(String candidate, String fallback) {
        String name = candidate == null ? "" : candidate.trim();
        if (name.isEmpty()) name = fallback;
        name = name.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_");
        if (name.length() > 150) name = name.substring(0, 150);
        return name.isEmpty() ? fallback : name;
    }

    private final class ExportBridge {
        @JavascriptInterface
        public String beginExport(String filename, String mimeType) {
            try {
                String safe = safeFilename(filename, "nyra-export.bin");
                String mime = (mimeType == null || mimeType.trim().isEmpty()) ? "application/octet-stream" : mimeType.trim();
                if (mime.length() > 120 || mime.contains("\r") || mime.contains("\n")) mime = "application/octet-stream";
                File temp = File.createTempFile("nyra-export-", ".tmp", getCacheDir());
                String token = UUID.randomUUID().toString();
                transfers.put(token, new ExportTransfer(safe, mime, temp));
                return token;
            } catch (Exception ex) {
                return "";
            }
        }

        @JavascriptInterface
        public boolean appendExportChunk(String token, String encodedChunk) {
            ExportTransfer transfer = transfers.get(token);
            if (transfer == null || encodedChunk == null) return false;
            byte[] data;
            try {
                data = Base64.decode(encodedChunk, Base64.DEFAULT);
            } catch (IllegalArgumentException ex) {
                discardTransfer(token, transfer);
                return false;
            }
            synchronized (transfer) {
                if (transfer.bytes + data.length > MAX_EXPORT_BYTES) {
                    discardTransfer(token, transfer);
                    return false;
                }
                try (FileOutputStream out = new FileOutputStream(transfer.file, true)) {
                    out.write(data);
                    transfer.bytes += data.length;
                    return true;
                } catch (Exception ex) {
                    discardTransfer(token, transfer);
                    return false;
                }
            }
        }

        @JavascriptInterface
        public boolean finishExport(String token) {
            ExportTransfer transfer = transfers.remove(token);
            if (transfer == null) return false;
            synchronized (completedExports) {
                completedExports.add(transfer);
            }
            runOnUiThread(() -> launchNextDocumentPicker());
            return true;
        }

        @JavascriptInterface
        public void cancelExport(String token) {
            ExportTransfer transfer = transfers.remove(token);
            if (transfer != null) transfer.file.delete();
        }
    }

    private void discardTransfer(String token, ExportTransfer transfer) {
        transfers.remove(token);
        transfer.file.delete();
    }

    private void launchNextDocumentPicker() {
        synchronized (completedExports) {
            if (documentPickerOpen || completedExports.isEmpty()) return;
            pendingDocument = completedExports.poll();
            documentPickerOpen = true;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(pendingDocument.mime);
            intent.putExtra(Intent.EXTRA_TITLE, pendingDocument.name);
            startActivityForResult(intent, CREATE_DOCUMENT_REQUEST);
        } catch (Exception ex) {
            if (pendingDocument != null) pendingDocument.file.delete();
            pendingDocument = null;
            documentPickerOpen = false;
            Toast.makeText(this, "Não foi possível abrir o seletor de arquivos.", Toast.LENGTH_LONG).show();
            launchNextDocumentPicker();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != CREATE_DOCUMENT_REQUEST) return;

        ExportTransfer transfer = pendingDocument;
        pendingDocument = null;
        documentPickerOpen = false;
        if (transfer == null) {
            launchNextDocumentPicker();
            return;
        }

        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri destination = data.getData();
            new Thread(() -> copyExportToUri(transfer, destination)).start();
        } else {
            transfer.file.delete();
            Toast.makeText(this, "Exportação cancelada; o projeto original continua aberto.", Toast.LENGTH_SHORT).show();
            launchNextDocumentPicker();
        }
    }

    private void copyExportToUri(ExportTransfer transfer, Uri destination) {
        boolean success = false;
        try (InputStream in = new BufferedInputStream(new FileInputStream(transfer.file));
             OutputStream out = new BufferedOutputStream(getContentResolver().openOutputStream(destination, "w"))) {
            if (out == null) throw new IllegalStateException("Não foi possível abrir o destino.");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            out.flush();
            success = true;
        } catch (Exception ex) {
            final String message = ex.getMessage() == null ? "erro ao gravar" : ex.getMessage();
            runOnUiThread(() -> Toast.makeText(this, "Falha ao salvar: " + message, Toast.LENGTH_LONG).show());
        } finally {
            transfer.file.delete();
        }
        if (success) runOnUiThread(() -> Toast.makeText(this, "Arquivo salvo: " + transfer.name, Toast.LENGTH_LONG).show());
        runOnUiThread(this::launchNextDocumentPicker);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        for (ExportTransfer transfer : transfers.values()) transfer.file.delete();
        transfers.clear();
        synchronized (completedExports) {
            for (ExportTransfer transfer : completedExports) transfer.file.delete();
            completedExports.clear();
        }
        if (pendingDocument != null) pendingDocument.file.delete();
        if (webView != null) {
            webView.removeJavascriptInterface("NyraAndroid");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
