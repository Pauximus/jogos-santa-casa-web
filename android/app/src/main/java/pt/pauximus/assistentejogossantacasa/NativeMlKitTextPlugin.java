package pt.pauximus.assistentejogossantacasa;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

@CapacitorPlugin(name = "NativeMlKitText")
public class NativeMlKitTextPlugin extends Plugin {
  private final TextRecognizer recognizer =
    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

  @PluginMethod
  public void recognize(PluginCall call) {
    String dataUrl = call.getString("dataUrl");
    if (dataUrl == null || dataUrl.trim().isEmpty()) {
      call.reject("Não foi recebida nenhuma imagem.");
      return;
    }

    try {
      int comma = dataUrl.indexOf(',');
      String base64 = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
      byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
      Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
      if (bitmap == null) {
        call.reject("A fotografia não pôde ser descodificada.");
        return;
      }

      InputImage image = InputImage.fromBitmap(bitmap, 0);
      recognizer.process(image)
        .addOnSuccessListener(result -> resolveText(call, result))
        .addOnFailureListener(error -> call.reject("Falha do Google ML Kit: " + error.getMessage(), error));
    } catch (Exception e) {
      call.reject("Erro ao preparar a fotografia para o ML Kit: " + e.getMessage(), e);
    }
  }

  private void resolveText(PluginCall call, Text visionText) {
    JSObject out = new JSObject();
    JSArray lines = new JSArray();
    for (Text.TextBlock block : visionText.getTextBlocks()) {
      for (Text.Line line : block.getLines()) {
        JSObject row = new JSObject();
        row.put("text", line.getText());
        if (line.getBoundingBox() != null) {
          row.put("left", line.getBoundingBox().left);
          row.put("top", line.getBoundingBox().top);
          row.put("right", line.getBoundingBox().right);
          row.put("bottom", line.getBoundingBox().bottom);
        }
        lines.put(row);
      }
    }
    out.put("text", visionText.getText());
    out.put("lines", lines);
    call.resolve(out);
  }

  @Override
  protected void handleOnDestroy() {
    recognizer.close();
    super.handleOnDestroy();
  }
}
