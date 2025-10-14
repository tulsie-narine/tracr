# Tracr Agent MSI Installer

This directory contains the WiX Toolset configuration for building Windows Installer (MSI) packages for the Tracr Agent.

## Prerequisites

### WiX Toolset
Download and install WiX Toolset v3.11 or later from:
https://github.com/wixtoolset/wix3/releases

Ensure the WiX tools (`candle.exe`, `light.exe`) are in your PATH.

### Code Signing (Optional)
For production deployments, you should sign the MSI with a code signing certificate:

1. Obtain a code signing certificate from a trusted CA
2. Set environment variables:
   ```cmd
   set SIGNTOOL_CERT=path\to\certificate.p12
   set SIGNTOOL_PASS=certificate_password
   ```

## Building the MSI

### Prerequisites Check
```cmd
# Verify WiX is installed
where candle.exe
where light.exe

# Verify agent binary is built
dir ..\build\agent.exe
```

### Build Process

1. Build the agent binary first:
   ```cmd
   cd ..
   make build
   cd installer
   ```

2. Build the MSI:
   ```cmd
   build.bat 1.0.0
   ```

   This creates `TracrAgent-1.0.0.msi`

### Build Script Options

The `build.bat` script supports the following:

- **Version Parameter**: `build.bat 1.2.3`
- **Automatic Template Creation**: Creates config and license templates if missing
- **Code Signing**: Signs MSI if certificate is configured
- **Clean Build**: Removes intermediate files after build

## MSI Features

### Installation Components
- **Agent Executable**: Installs to `C:\Program Files\TracrAgent\`
- **Windows Service**: Automatically registers and configures service
- **Configuration**: Creates config template in `C:\ProgramData\TracrAgent\`
- **Directories**: Creates data and logs directories with proper permissions

### Service Configuration
- **Service Name**: `TracrAgent`
- **Display Name**: `Tracr Agent`
- **Account**: Local System
- **Startup Type**: Automatic
- **Dependencies**: None

### Upgrade Behavior
- **In-Place Upgrades**: Supported for newer versions
- **Downgrade Protection**: Prevents installation of older versions
- **Service Handling**: Stops service during upgrade, restarts after

## Installation

### Silent Installation
```cmd
msiexec /i TracrAgent-1.0.0.msi /quiet
```

### Interactive Installation
```cmd
msiexec /i TracrAgent-1.0.0.msi
```

### Installation with Logging
```cmd
msiexec /i TracrAgent-1.0.0.msi /l*v install.log
```

### Properties
You can set properties during installation:

```cmd
msiexec /i TracrAgent-1.0.0.msi INSTALLDIR="C:\MyPath\TracrAgent"
```

## Uninstallation

### Silent Uninstallation
```cmd
msiexec /x TracrAgent-1.0.0.msi /quiet
```

### Uninstall by Product Code
```cmd
# Find product code
wmic product where "name='Tracr Agent'" get identifyingnumber

# Uninstall
msiexec /x {PRODUCT-CODE-GUID} /quiet
```

## Group Policy Deployment

### Software Installation Policy

1. Open Group Policy Management Console
2. Navigate to: Computer Configuration → Software Settings → Software Installation
3. Right-click → New → Package
4. Browse to the MSI file on a network share
5. Select "Assigned" deployment method
6. Configure deployment options as needed

### Sample GPO Configuration
```
Deployment Method: Assigned
Installation UI Options: Basic
Uninstall when policy is removed: Yes
Install at logon: Yes
```

## SCCM/ConfigMgr Deployment

### Application Creation
1. Create new Application in Configuration Manager
2. Specify MSI file as deployment type
3. Configure detection method (registry or file-based)
4. Set installation command: `msiexec /i TracrAgent-1.0.0.msi /quiet`
5. Set uninstall command: `msiexec /x TracrAgent-1.0.0.msi /quiet`

### Detection Rule
Registry-based detection:
- **Hive**: HKEY_LOCAL_MACHINE
- **Key**: `SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{ProductCode}`
- **Value**: DisplayVersion
- **Operator**: Equals
- **Value**: 1.0.0

## Troubleshooting

### Common Build Errors

#### WiX Toolset Not Found
```
Error: WiX Toolset not found in PATH
```
**Solution**: Install WiX Toolset and add to PATH

#### Agent Binary Missing
```
Error: Agent binary not found
```
**Solution**: Run `make build` in parent directory first

#### Compilation Errors
```
Error: Failed to compile WiX source
```
**Solution**: Check Product.wxs for syntax errors, verify file paths

### Installation Issues

#### Service Registration Failed
- Check Windows Event Log for service installation errors
- Verify installer is running with administrator privileges
- Ensure no conflicting services exist

#### Permission Denied
- Run installation as Administrator
- Check file/directory permissions on target locations
- Verify Windows Installer service is running

### Upgrade Issues

#### "Another version is already installed"
- Ensure upgrade code matches between versions
- Use proper versioning (newer version numbers)
- Consider manual uninstall/reinstall for major version changes

## Advanced Configuration

### Custom Installation Directory
Modify the `INSTALLDIR` property in the WiX source or during installation:
```cmd
msiexec /i TracrAgent-1.0.0.msi INSTALLDIR="C:\CustomPath\TrackerAgent"
```

### Service Account Configuration
To change the service account from Local System, modify the `ServiceInstall` element in Product.wxs:
```xml
<ServiceInstall Account="[SERVICEACCOUNT]" Password="[SERVICEPASSWORD]" ... />
```

### Additional Features
The WiX source can be extended to include:
- Registry settings
- Firewall rules
- Additional files
- Custom actions
- Conditional installation logic

## File Structure

```
installer/
├── Product.wxs          # WiX source file
├── build.bat           # Build script
├── config-template.json # Default configuration (auto-generated)
├── License.rtf         # License agreement (auto-generated)
└── README.md          # This file
```

## Security Considerations

- MSI should be signed with valid code signing certificate
- Deploy from trusted network locations only
- Validate MSI integrity before deployment
- Use least-privilege accounts for service execution
- Configure appropriate file system permissions