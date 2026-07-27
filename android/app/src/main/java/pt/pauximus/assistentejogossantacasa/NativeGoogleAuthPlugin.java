package pt.pauximus.assistentejogossantacasa;

import android.os.CancellationSignal;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId");

        if (serverClientId == null || serverClientId.trim().isEmpty()) {
            call.reject("Falta o Google Web Client ID.");
            return;
        }

        if (getActivity() == null) {
            call.reject("A atividade Android ainda não está disponível.");
            return;
        }

        GetSignInWithGoogleOption googleOption =
            new GetSignInWithGoogleOption.Builder(serverClientId.trim()).build();

        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build();

        CredentialManager credentialManager = CredentialManager.create(getContext());
        CancellationSignal cancellationSignal = new CancellationSignal();

        credentialManager.getCredentialAsync(
            getActivity(),
            request,
            cancellationSignal,
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    handleCredential(call, result.getCredential());
                }

                @Override
                public void onError(@NonNull GetCredentialException error) {
                    String message = error.getMessage();
                    call.reject(
                        "Login Google cancelado ou indisponível"
                            + (message == null || message.isBlank() ? "." : ": " + message),
                        error
                    );
                }
            }
        );
    }

    private void handleCredential(PluginCall call, Credential credential) {
        if (!(credential instanceof CustomCredential)) {
            call.reject("O Google devolveu um tipo de credencial inesperado.");
            return;
        }

        CustomCredential customCredential = (CustomCredential) credential;
        String credentialType = customCredential.getType();

        boolean isGoogleIdToken =
            GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credentialType)
                || GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_SIWG_CREDENTIAL.equals(credentialType);

        if (!isGoogleIdToken) {
            call.reject("A credencial recebida não é um Google ID Token.");
            return;
        }

        try {
            GoogleIdTokenCredential googleCredential =
                GoogleIdTokenCredential.createFrom(customCredential.getData());

            JSObject result = new JSObject();
            result.put("idToken", googleCredential.getIdToken());
            result.put("email", googleCredential.getId());
            result.put("displayName", googleCredential.getDisplayName());

            if (googleCredential.getProfilePictureUri() != null) {
                result.put("avatarUrl", googleCredential.getProfilePictureUri().toString());
            }

            call.resolve(result);
        } catch (Exception error) {
            call.reject("Erro ao processar o login Google.", error);
        }
    }
}
