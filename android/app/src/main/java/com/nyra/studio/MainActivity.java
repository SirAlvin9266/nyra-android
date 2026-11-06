package com.nyra.studio;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.webkit.WebResourceError;
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
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class MainActivity extends Activity {
    private static final int CREATE_DOCUMENT_REQUEST = 4207;
    private static final int FILE_CHOOSER_REQUEST = 4208;
    private static final long MAX_EXPORT_BYTES = 256L * 1024L * 1024L;
    private static final long MAX_REBUILDABLE_CACHE_BYTES = 512L * 1024L * 1024L;
    private static final long REBUILDABLE_CACHE_RETENTION_MS = 7L * 24L * 60L * 60L * 1000L;
    private static final long MAX_SAVED_PROJECT_BYTES = 240L * 1024L * 1024L;
    private static final int PROJECT_CHUNK_BYTES = 48 * 1024;
    private static final String SAVED_PROJECT_FILE = "scene-model.json";
    private final Map<String, File> projectWrites = new ConcurrentHashMap<>();

    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private ValueCallback<Uri[]> pendingFileChooser;
    private boolean pendingFileChooserMultiple;
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
        pruneRebuildableCache();

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
        webView.getSettings().setSupportZoom(true);
        webView.getSettings().setBuiltInZoomControls(true);
        webView.getSettings().setDisplayZoomControls(false);
        webView.getSettings().setUseWideViewPort(true);
        webView.getSettings().setLoadWithOverviewMode(false);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.addJavascriptInterface(new ExportBridge(), "NyraAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                android.util.Log.i("NyraWebView", "Page started: " + url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                android.util.Log.i("NyraWebView", "Page finished: " + url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    android.util.Log.e("NyraWebView", "Main frame error " + request.getUrl()
                        + " code=" + error.getErrorCode() + " description=" + error.getDescription());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                            android.webkit.WebResourceResponse response) {
                android.util.Log.e("NyraWebView", "HTTP " + response.getStatusCode()
                    + " " + request.getUrl());
            }

            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                android.util.Log.e("NyraWebView", consoleMessage.messageLevel() + " "
                    + consoleMessage.message() + " -- " + consoleMessage.sourceId()
                    + ":" + consoleMessage.lineNumber());
                return true;
            }

            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams
            ) {
                if (pendingFileChooser != null) {
                    pendingFileChooser.onReceiveValue(null);
                    pendingFileChooser = null;
                }
                pendingFileChooser = filePathCallback;
                pendingFileChooserMultiple = fileChooserParams != null
                    && fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE;
                try {
                    Intent intent = fileChooserParams != null
                        ? fileChooserParams.createIntent()
                        : new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    if (intent.getType() == null) intent.setType("*/*");
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception ex) {
                    pendingFileChooser = null;
                    pendingFileChooserMultiple = false;
                    filePathCallback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "Não foi possível abrir o seletor de arquivos.", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });
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

    private File rebuildableCacheDirectory() {
        return new File(getCacheDir(), "nyra-rebuildable");
    }

    private long rebuildableCacheBytes() {
        File directory = rebuildableCacheDirectory();
        long bytes = 0L;
        File[] entries = directory.listFiles();
        if (entries != null) {
            for (File entry : entries) {
                if (entry.isFile()) bytes += entry.length();
            }
        }
        return bytes;
    }

    private boolean isRebuildableExportActive(File candidate) {
        for (ExportTransfer transfer : transfers.values()) {
            if (transfer.file.equals(candidate)) return true;
        }
        synchronized (completedExports) {
            for (ExportTransfer transfer : completedExports) {
                if (transfer.file.equals(candidate)) return true;
            }
        }
        return pendingDocument != null && pendingDocument.file.equals(candidate);
    }

    private void pruneRebuildableCache() {
        File directory = rebuildableCacheDirectory();
        if (!directory.isDirectory()) return;
        long cutoff = System.currentTimeMillis() - REBUILDABLE_CACHE_RETENTION_MS;
        File[] entries = directory.listFiles();
        if (entries == null) return;
        for (File entry : entries) {
            if (entry.isFile() && entry.getName().startsWith("nyra-export-")
                && entry.lastModified() < cutoff && !isRebuildableExportActive(entry)) {
                entry.delete();
            }
        }
    }

    private final class ExportBridge {
        @JavascriptInterface
        public String beginProjectSave(String filename) {
            try {
                if (!SAVED_PROJECT_FILE.equals(safeFilename(filename, SAVED_PROJECT_FILE))) return "";
                File dir = new File(getFilesDir(), "nyra-projects");
                if (!dir.exists() && !dir.mkdirs()) return "";
                File pending = File.createTempFile("scene-model-", ".pending", dir);
                String token = UUID.randomUUID().toString();
                projectWrites.put(token, pending);
                return token;
            } catch (Exception ex) { return ""; }
        }

        @JavascriptInterface
        public boolean appendProjectSaveChunk(String token, String encodedChunk) {
            File pending = projectWrites.get(token);
            if (pending == null || encodedChunk == null) return false;
            byte[] bytes;
            try { bytes = Base64.decode(encodedChunk, Base64.DEFAULT); }
            catch (IllegalArgumentException ex) { cancelProjectSave(token); return false; }
            synchronized (pending) {
                if (pending.length() + bytes.length > MAX_SAVED_PROJECT_BYTES) { cancelProjectSave(token); return false; }
                try (FileOutputStream out = new FileOutputStream(pending, true)) {
                    out.write(bytes); out.getFD().sync(); return true;
                } catch (Exception ex) { cancelProjectSave(token); return false; }
            }
        }

        @JavascriptInterface
        public boolean finishProjectSave(String token) {
            File pending = projectWrites.remove(token);
            if (pending == null || !pending.isFile() || pending.length() < 2) return false;
            File target = new File(pending.getParentFile(), SAVED_PROJECT_FILE);
            File backup = new File(pending.getParentFile(), SAVED_PROJECT_FILE + ".previous");
            if (target.exists() && !target.renameTo(backup)) { pending.delete(); return false; }
            if (!pending.renameTo(target)) {
                if (backup.exists()) backup.renameTo(target);
                pending.delete(); return false;
            }
            if (backup.exists()) backup.delete();
            return true;
        }

        @JavascriptInterface
        public void cancelProjectSave(String token) {
            File pending = projectWrites.remove(token);
            if (pending != null) pending.delete();
        }

        private File savedProjectDirectory() {
            return new File(getFilesDir(), "nyra-projects");
        }

        private File recoverSavedProjectFile() {
            File directory = savedProjectDirectory();
            File target = new File(directory, SAVED_PROJECT_FILE);
            File backup = new File(directory, SAVED_PROJECT_FILE + ".previous");
            if (!target.isFile() && backup.isFile()) backup.renameTo(target);
            if (target.isFile() && backup.exists()) backup.delete();
            File[] entries = directory.listFiles();
            if (entries != null) {
                for (File entry : entries) {
                    if (entry.isFile() && entry.getName().startsWith("scene-model-") && entry.getName().endsWith(".pending")) entry.delete();
                }
            }
            return target;
        }

        @JavascriptInterface
        public String getSavedProjectInfo() {
            File target = recoverSavedProjectFile();
            return target.isFile()
                ? "{\\"exists\\":true,\\"bytes\\":" + target.length() + "}"
                : "{\\"exists\\":false}";
        }

        @JavascriptInterface
        public String readSavedProjectChunk(long offset, int length) {
            if (offset < 0 || length < 1 || length > PROJECT_CHUNK_BYTES) return "";
            File target = recoverSavedProjectFile();
            if (!target.isFile() || offset >= target.length()) return "";
            byte[] bytes = new byte[(int)Math.min(length, target.length() - offset)];
            try (java.io.RandomAccessFile file = new java.io.RandomAccessFile(target, "r")) {
                file.seek(offset); file.readFully(bytes); return Base64.encodeToString(bytes, Base64.NO_WRAP);
            } catch (Exception ex) { return ""; }
        }

        @JavascriptInterface
        public boolean deleteSavedProject() {
            if (!projectWrites.isEmpty()) return false;
            File target = recoverSavedProjectFile();
            File backup = new File(savedProjectDirectory(), SAVED_PROJECT_FILE + ".previous");
            return (!target.exists() || target.delete()) && (!backup.exists() || backup.delete());
        }

        @JavascriptInterface
        public String beginExport(String filename, String mimeType) {
            try {
                String safe = safeFilename(filename, "nyra-export.bin");
                String mime = (mimeType == null || mimeType.trim().isEmpty()) ? "application/octet-stream" : mimeType.trim();
                if (mime.length() > 120 || mime.contains("\r") || mime.contains("\n")) mime = "application/octet-stream";
                File cacheRoot = new File(getCacheDir(), "nyra-rebuildable");
                pruneRebuildableCache();
                if (!cacheRoot.exists() && !cacheRoot.mkdirs()) throw new IllegalStateException("Não foi possível criar o cache temporário Nyra.");
                File temp = File.createTempFile("nyra-export-", ".tmp", cacheRoot);
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
                if (transfer.bytes + data.length > MAX_EXPORT_BYTES
                    || rebuildableCacheBytes() + data.length > MAX_REBUILDABLE_CACHE_BYTES) {
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

    @JavascriptInterface
    public String getRebuildableCacheReport() {
        File directory = new File(getCacheDir(), "nyra-rebuildable");
        long bytes = 0L;
        int files = 0;
        if (directory.isDirectory()) {
            File[] entries = directory.listFiles();
            if (entries != null) {
                for (File entry : entries) {
                    if (entry.isFile()) {
                        bytes += entry.length();
                        files++;
                    }
                }
            }
        }
        return "{\"files\":" + files + ",\"bytes\":" + bytes
            + ",\"limitBytes\":" + MAX_REBUILDABLE_CACHE_BYTES
            + ",\"retentionDays\":7}";
    }

    @JavascriptInterface
    public boolean clearRebuildableCache() {
        synchronized (completedExports) {
            if (!transfers.isEmpty() || pendingDocument != null || !completedExports.isEmpty() || documentPickerOpen) {
                return false;
            }
        }
        File directory = new File(getCacheDir(), "nyra-rebuildable");
        if (!directory.exists()) return true;
        File[] entries = directory.listFiles();
        if (entries == null) return false;
        boolean success = true;
        for (File entry : entries) {
            if (entry.isFile() && entry.getName().startsWith("nyra-export-")) {
                success &= entry.delete();
            }
        }
        File[] remaining = directory.listFiles();
        if (success && remaining != null && remaining.length == 0) {
            success = directory.delete();
        }
        return success;
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
        for (File pending : projectWrites.values()) pending.delete();
        projectWrites.clear();
            pendingDocument = null;
            documentPickerOpen = false;
            Toast.makeText(this, "Não foi possível abrir o seletor de arquivos.", Toast.LENGTH_LONG).show();
            launchNextDocumentPicker();
        }
    }

    private static void addUniqueUri(Set<Uri> uris, Uri uri) {
        if (uri != null) uris.add(uri);
    }

    private static Uri[] collectSelectedUris(Intent data, boolean allowMultiple) {
        if (data == null) return null;

        Set<Uri> selected = new LinkedHashSet<>();
        if (allowMultiple) {
            ClipData clipData = data.getClipData();
            if (clipData != null) {
                for (int i = 0; i < clipData.getItemCount(); i++) {
                    addUniqueUri(selected, clipData.getItemAt(i).getUri());
                }
            }
        }

        // Providers may return a single data URI even for a multi-select request,
        // or return only ClipData for a single-select request.
        addUniqueUri(selected, data.getData());
        return selected.isEmpty() ? null : selected.toArray(new Uri[0]);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST) {
            ValueCallback<Uri[]> callback = pendingFileChooser;
            boolean allowMultiple = pendingFileChooserMultiple;
            pendingFileChooser = null;
            pendingFileChooserMultiple = false;

            if (callback != null) {
                Uri[] result = resultCode == RESULT_OK
                    ? collectSelectedUris(data, allowMultiple)
                    : null;
                if (result != null) {
                    for (Uri uri : result) {
                        try {
                            getContentResolver().takePersistableUriPermission(
                                uri,
                                Intent.FLAG_GRANT_READ_URI_PERMISSION
                            );
                        } catch (SecurityException ignored) {
                            // Some document providers grant only a transient read
                            // permission; WebView can still read during this session.
                        }
                    }
                }
                callback.onReceiveValue(result);
            }
            return;
        }

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
        if (pendingFileChooser != null) {
            pendingFileChooser.onReceiveValue(null);
            pendingFileChooser = null;
        }
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
