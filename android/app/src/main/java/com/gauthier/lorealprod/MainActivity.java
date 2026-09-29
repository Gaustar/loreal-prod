package com.gauthier.lorealprod;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

// Ciblant le SDK 35+, l'edge-to-edge est imposé par le système et ne peut plus
// être désactivé côté fenêtre (setDecorFitsSystemWindows(true) est ignoré).
// On applique donc manuellement les marges des barres système comme padding
// sur la vue racine (android.R.id.content, pas la WebView elle-même : c'est le
// conteneur qui reçoit effectivement les WindowInsets), pour que le contenu
// (dont les FAB fixes) ne soit jamais dessiné derrière la barre de statut ou
// la barre de navigation.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
