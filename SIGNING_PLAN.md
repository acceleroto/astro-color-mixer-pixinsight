# Astro Color Mixer PixInsight Signing Plan

## Scope

This document describes the PixInsight signing workflow required for the `astro-color-mixer-pixinsight` repository and the `AstroColorMixer-0.9.3-beta.zip` update package.

It is based on PixInsight's official code-signing and update-repository documentation, plus a few clearly labeled implementation inferences where PixInsight's public documentation does not spell out a specific user-visible status string.

## Short Answer

For a public PixInsight update repository, the critical signing target is **`updates/updates.xri`**, not the ZIP itself.

The ZIP is authenticated indirectly through:

- the SHA1 checksum stored in `updates.xri`
- the XML signature embedded in `updates.xri`

If you also want the installed script itself to carry a code signature after installation, then the script file `AstroColorMixer.js` must additionally have a companion **`.xsgn`** signature file placed beside it in the installed script directory.

For a public third-party repository that other users will consume, PixInsight recommends using a **Certified PixInsight Developer (CPD)** identity for repository signing.

## 1. Which PixInsight tool/script generates the signing key pair?

Use PixInsight's standard **SigningKeys** script.

Official PixInsight documentation states that:

- the **SigningKeys** script creates a new public/private signing key pair
- the keys are stored in a secure signing keys file
- the same script can be used for both CPD identities and local signing identities

Practical meaning for Astro Color Mixer:

- if this repository is only for your own local testing, you can generate a **local signing identity**
- if this repository is for public GitHub distribution to other PixInsight users, you should generate a **CPD** signing identity and submit the public key through PixInsight's CPD process

## 2. What files are created for the signing identity?

The main signing-identity file created by PixInsight is:

- **`.xssk`** — secure signing keys file

What it contains:

- developer identifier
- public signing key
- private signing key
- encrypted integrity/checksum protection

Related identity/trust files mentioned by PixInsight:

- **`.xcdev`** — PixInsight certified developers database distributed by PixInsight itself
- **local signing identity** data can also be stored by PixInsight in application settings when using `Script > Local Signing Identity...`

Important distinction:

- **You create and keep the `.xssk` file privately.**
- **You do not publish the `.xssk` file.**
- **The public key becomes trusted for public distribution only after CPD submission and PixInsight distribution of that public key through its certified developers database.**

## 3. Which files must be signed: `AstroColorMixer.js`, the update ZIP, `updates.xri`, or some combination?

### Minimum required for repository trust

For a PixInsight update repository, the official signing target is:

- **`updates.xri`**

PixInsight's official documentation says update repositories should be signed by signing the repository information document (`.xri`), and that repository signatures are embedded directly in the `.xri` file as a top-level `<Signature>` element.

### What is not signed directly

The update ZIP:

- is **not** separately signed by PixInsight's repository-signing mechanism
- is referenced by file name and SHA1 inside `updates.xri`

So the effective trust chain is:

1. PixInsight verifies the signature on `updates.xri`
2. PixInsight reads the ZIP filename and SHA1 from trusted `updates.xri`
3. PixInsight verifies the downloaded ZIP against that SHA1

### Optional but recommended for installed script authenticity

If you want the installed script itself to have a PixInsight script code signature, then sign:

- **`src/scripts/CosgrovesCosmos/AstroColorMixer.js`**

That generates:

- **`src/scripts/CosgrovesCosmos/AstroColorMixer.xsgn`**

PixInsight's script-signing docs say:

- executable JavaScript scripts with `#feature-id` or `#script-id` can be signed
- the signature is stored as a neighboring **`.xsgn`** file
- included `.jsh` and non-executable support files generally should **not** be signed individually

### Recommended combination for Astro Color Mixer

For this repository, the practical recommended combination is:

1. **Always sign `updates.xri`**
2. **Optionally also sign `AstroColorMixer.js` and ship `AstroColorMixer.xsgn`**

That gives:

- trusted repository metadata
- trusted installed script authenticity

## 4. Where must public key/signature files be placed in the repository?

### Public key

For a public CPD workflow:

- the public key is **not** stored as a separate file in your repository
- PixInsight trusts it from its own **certified developers database** (`.xcdev`) after CPD submission and distribution

So for public GitHub packaging:

- **do not upload the `.xssk` file**
- **do not upload a standalone public-key file unless PixInsight later adds a new documented requirement**

### Repository signature

Repository signature placement:

- embedded directly inside **`updates/updates.xri`**
- as a top-level **`<Signature>`** element appended to the XML document

### Script signature

If you sign the script itself:

- the signature file must have the same filename plus **`.xsgn`**
- it must sit in the **same directory** as the script

For Astro Color Mixer that would be:

- `src/scripts/CosgrovesCosmos/AstroColorMixer.js`
- `src/scripts/CosgrovesCosmos/AstroColorMixer.xsgn`

## 5. What command or PixInsight script performs XRI signing?

PixInsight's standard tool for this is the **CodeSign** script.

Officially documented options:

- the **CodeSign** script can sign repository information documents (`.xri`)
- the lower-level PJSR API is `Security.generateXMLSignature(...)`

For practical use, the main choices are:

### Preferred interactive route

- run PixInsight's **CodeSign** script
- select `updates.xri`
- provide the `.xssk` keys file
- provide the password

### Automatable route

Use PixInsight's JavaScript runtime and call:

- `Security.generateXMLSignature(filePath, keysFilePath, password)`

That function:

- rewrites the `.xri` file
- inserts or replaces the top-level `<Signature>` element

## 6. What generated signature files must be uploaded to GitHub?

### Required for repository signing

Upload:

- `updates/updates.xri`

Because the repository signature is stored inside that file.

### If script signing is also enabled

Upload:

- `src/scripts/CosgrovesCosmos/AstroColorMixer.xsgn`

alongside:

- `src/scripts/CosgrovesCosmos/AstroColorMixer.js`

### Do not upload

- the private signing keys file (`.xssk`)
- any password files
- any local-only signing identity material

### For Astro Color Mixer, the likely final signed release set becomes

- `src/scripts/CosgrovesCosmos/AstroColorMixer.js`
- `src/scripts/CosgrovesCosmos/AstroColorMixer.xsgn` if script signing is enabled
- `updates/AstroColorMixer-0.9.3-beta.zip`
- `updates/SHA1SUMS.txt`
- `updates/updates.xri`

## 7. How should the build script be updated so signing happens after ZIP creation and before final upload?

The build order should become:

1. Copy the current source script into the repository script path
2. If script signing is enabled:
   - sign `src/scripts/CosgrovesCosmos/AstroColorMixer.js`
   - generate `AstroColorMixer.xsgn`
3. Build the update ZIP
4. Compute the ZIP SHA1
5. Rewrite `updates.xri` with the new SHA1 and metadata
6. Sign `updates.xri`
7. Copy the finished outputs to the Dropbox backup location
8. Print the final upload checklist

### Important implementation detail

`updates.xri` must be signed **after**:

- the ZIP exists
- the ZIP SHA1 has been calculated
- the final XML content has been written

Otherwise the signature becomes invalid as soon as the file changes.

### Practical automation recommendation

The current shell build script should stay responsible for:

- copy
- ZIP creation
- SHA1 generation
- XRI templating
- backup copy

Then add a final signing step that launches PixInsight to run a tiny signing script, or runs a PixInsight JavaScript helper that calls:

- `Security.generateXMLSignature(...)`

If script signing is desired, the same helper can also call:

- `Security.generateScriptSignatureFile(...)`

### Best future shape for the build

Two-step release automation:

1. **shell build script**
   - creates ZIP
   - computes SHA1
   - writes unsigned `updates.xri`

2. **PixInsight signing helper**
   - signs `AstroColorMixer.js` to `.xsgn` if desired
   - signs `updates.xri`

This keeps PixInsight-specific cryptographic operations inside PixInsight, which is the officially documented environment for these signatures.

## 8. What is the exact tester-visible difference between unsigned, unavailable, invalid, and valid signatures?

PixInsight's official docs clearly define the behavior for **unsigned** and **invalid** signatures. The exact UI wording for **unavailable** is not formally documented in the references I found, so that part below is a careful inference.

### Valid signature

Tester-visible effect:

- PixInsight accepts the signed repository or script as trusted
- no unsigned-warning path is triggered
- authenticity and integrity checks succeed against a known public key

### Unsigned signature state

Repository case:

- repository has **no signature** in `updates.xri`
- PixInsight can still allow downloads if **Allow unsigned update repositories** is enabled
- the user is asked for explicit confirmation before downloading updates from that unsigned repository

Script case:

- script has **no `.xsgn` file**
- PixInsight can still allow execution if **Allow execution of unsigned scripts** is enabled

### Invalid signature

Tester-visible effect:

- PixInsight treats the signature as present but failing verification
- for scripts: execution with invalid code signatures is **always forbidden**
- for update repositories: downloading from repositories with invalid signatures is **always forbidden**

This is the hard-fail state.

### Unavailable signature

This label is **not explicitly defined** in the official docs I found. Based on PixInsight's trust model, it most likely means one of these:

- a signature exists but the public key needed to validate it is not available in the tester's installation
- the signature file or signed metadata is present but cannot be interpreted correctly
- the repository or script is signed with a local identity or a CPD key not yet trusted on the tester's installation

Practical tester-visible meaning:

- the signature is not being accepted as valid
- the repository/script should be treated as not successfully trusted on that machine

For a public repository, the safest interpretation is:

- **do not rely on local-signing-only signatures**
- **use a CPD identity if you want outside testers to see the repository as properly signed**

## Recommended Astro Color Mixer Signing Plan

### Phase 1: public repository trust

1. Generate a signing keys file with **SigningKeys**
2. If this repo is meant for outside testers, use a **CPD identity**
3. Keep the `.xssk` file private
4. Build the ZIP normally
5. Compute SHA1
6. Write `updates.xri`
7. Sign `updates.xri` with **CodeSign** or `Security.generateXMLSignature(...)`
8. Upload the signed `updates.xri`, ZIP, and SHA1 file

### Phase 2: script-level trust

1. Sign `AstroColorMixer.js`
2. Generate `AstroColorMixer.xsgn`
3. Include that `.xsgn` beside the script in the repository package

This is optional for repository operation, but desirable if you want the installed script itself to verify as signed.

## Recommended build-script change summary

The build script should eventually:

1. copy `AstroColorMixer_v0_9_3_beta.js` to repository script location
2. optionally sign `AstroColorMixer.js` and create `AstroColorMixer.xsgn`
3. build `AstroColorMixer-0.9.3-beta.zip`
4. compute SHA1
5. write `updates.xri`
6. sign `updates.xri`
7. back up the final outputs to Dropbox

## Sources

Primary official PixInsight references:

- [PixInsight Script Code Signing System](https://pixinsight.com/doc/docs/ScriptCodeSigning/ScriptCodeSigning.html)
- [PixInsight Update Repositories Reference](https://pixinsight.com/doc/docs/PIRepositoryReference/PIRepositoryReference.html)

Supplementary context on "signature unavailable" wording:

- [PixInsight Forum: Issue with Signature Unavailable with downloads](https://pixinsight.com/forum/index.php?threads%2Fissue-with-signature-unavailable-with-downloads.18729%2F=)

## Bottom Line

For Astro Color Mixer, the most important next signing step is:

- **sign `updates/updates.xri` with a CPD identity**

If you also want the installed script itself to verify as signed, then additionally:

- **generate and ship `AstroColorMixer.xsgn` beside `AstroColorMixer.js`**

The ZIP itself is not the PixInsight signing target; its integrity is carried by the SHA1 stored in the signed `updates.xri`.
