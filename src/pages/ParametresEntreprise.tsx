import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Building2, Upload, ImageIcon, X } from "lucide-react";
import { companySettingsApi, uploadApi, apiError } from "@/lib/api";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

const EMPTY_FORM = {
  raison_sociale: "",
  logo_url: "",
  adresse: "",
  code_postal: "",
  ville: "",
  pays: "Sénégal",
  telephone: "",
  email: "",
  site_web: "",
  ninea: "",
  registre_commerce: "",
  numero_tva: "",
  devise: "FCFA",
};

export default function ParametresEntreprisePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { refresh: refreshCompany } = useCompany();
  // Snapshot des valeurs chargées, pour le bouton Annuler
  const [snapshot, setSnapshot] = useState(EMPTY_FORM);
  const [formData, setFormData] = useState({
    raison_sociale: "",
    logo_url: "",
    adresse: "",
    code_postal: "",
    ville: "",
    pays: "Sénégal",
    telephone: "",
    email: "",
    site_web: "",
    ninea: "",
    registre_commerce: "",
    numero_tva: "",
    devise: "FCFA",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await companySettingsApi.get();
      if (settings) {
        const loaded = {
          raison_sociale: settings.raison_sociale || "",
          logo_url: settings.logo_url || "",
          adresse: settings.adresse || "",
          code_postal: settings.code_postal || "",
          ville: settings.ville || "",
          pays: settings.pays || "Sénégal",
          telephone: settings.telephone || "",
          email: settings.email || "",
          site_web: settings.site_web || "",
          ninea: settings.ninea || "",
          registre_commerce: settings.registre_commerce || "",
          numero_tva: settings.numero_tva || "",
          devise: settings.devise || "FCFA",
        };
        setFormData(loaded);
        setSnapshot(loaded);
      }
    } catch (err) {
      toast.error("Erreur lors du chargement des paramètres", { description: apiError(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Annuler = restaurer les dernières valeurs enregistrées (sans refetch/flicker)
  const handleCancel = () => {
    setFormData(snapshot);
    toast.info("Modifications annulées");
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permettre de re-sélectionner le même fichier
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo)");
      return;
    }

    setUploadingLogo(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await uploadApi.image(dataUrl, "btp-manager/logos");
      setFormData((prev) => ({ ...prev, logo_url: url }));
      toast.success("Logo téléversé", { description: "N'oubliez pas d'enregistrer" });
    } catch (err) {
      toast.error("Échec du téléversement du logo", { description: apiError(err) });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.raison_sociale.trim()) {
      toast.error("La raison sociale est obligatoire");
      return;
    }

    setSaving(true);
    try {
      await companySettingsApi.update(formData);
      toast.success("Paramètres enregistrés avec succès");
      await loadSettings();       // Recharger le formulaire + snapshot
      await refreshCompany();     // Propager le branding (sidebar, login, onglet) immédiatement
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb="Paramètres"
        title="Informations de l'entreprise"
        description="Configuration des coordonnées et informations légales"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Informations générales */}
          <Card className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold">Informations générales</h3>
                <p className="text-sm text-muted-foreground">Identité et coordonnées de l'entreprise</p>
              </div>
            </div>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="raison_sociale">Raison sociale *</Label>
                <Input
                  id="raison_sociale"
                  value={formData.raison_sociale}
                  onChange={(e) => handleChange("raison_sociale", e.target.value)}
                  placeholder="Ex: BTP Sénégal SARL"
                  required
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Logo de l'entreprise</Label>
                <div className="flex items-center gap-4 mt-1.5">
                  {/* Aperçu */}
                  <div className="w-24 h-24 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" asChild disabled={uploadingLogo}>
                        <label className="cursor-pointer">
                          {uploadingLogo ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {uploadingLogo ? "Téléversement…" : "Téléverser un logo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoFile}
                            disabled={uploadingLogo}
                          />
                        </label>
                      </Button>
                      {formData.logo_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChange("logo_url", "")}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Retirer
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG ou SVG (max 5 Mo). Le logo apparaît sur les bons de commande PDF.
                      Hébergement sécurisé via Cloudinary.
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => handleChange("adresse", e.target.value)}
                  placeholder="Ex: Zone Industrielle, Route de Rufisque"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="code_postal">Code postal / BP</Label>
                <Input
                  id="code_postal"
                  value={formData.code_postal}
                  onChange={(e) => handleChange("code_postal", e.target.value)}
                  placeholder="Ex: BP 5432"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={formData.ville}
                  onChange={(e) => handleChange("ville", e.target.value)}
                  placeholder="Ex: Dakar"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="pays">Pays</Label>
                <Input
                  id="pays"
                  value={formData.pays}
                  onChange={(e) => handleChange("pays", e.target.value)}
                  placeholder="Ex: Sénégal"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="devise">Devise</Label>
                <Input
                  id="devise"
                  value={formData.devise}
                  onChange={(e) => handleChange("devise", e.target.value)}
                  placeholder="Ex: FCFA"
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>

          {/* Coordonnées */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Coordonnées</h3>
              <p className="text-sm text-muted-foreground">Moyens de contact</p>
            </div>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => handleChange("telephone", e.target.value)}
                  placeholder="Ex: +221 33 123 45 67"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Ex: contact@btp-senegal.sn"
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="site_web">Site web</Label>
                <Input
                  id="site_web"
                  type="url"
                  value={formData.site_web}
                  onChange={(e) => handleChange("site_web", e.target.value)}
                  placeholder="Ex: https://www.btp-senegal.sn"
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>

          {/* Informations légales */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Informations légales</h3>
              <p className="text-sm text-muted-foreground">Numéros d'identification et immatriculations</p>
            </div>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ninea">NINEA</Label>
                <Input
                  id="ninea"
                  value={formData.ninea}
                  onChange={(e) => handleChange("ninea", e.target.value)}
                  placeholder="Ex: SN-DKR-2020-A-12345"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Numéro d'Identification Nationale des Entreprises et Associations
                </p>
              </div>

              <div>
                <Label htmlFor="registre_commerce">Registre de commerce</Label>
                <Input
                  id="registre_commerce"
                  value={formData.registre_commerce}
                  onChange={(e) => handleChange("registre_commerce", e.target.value)}
                  placeholder="Ex: SN-DKR-2020-B-67890"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="numero_tva">Numéro TVA</Label>
                <Input
                  id="numero_tva"
                  value={formData.numero_tva}
                  onChange={(e) => handleChange("numero_tva", e.target.value)}
                  placeholder="Ex: SN123456789"
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
