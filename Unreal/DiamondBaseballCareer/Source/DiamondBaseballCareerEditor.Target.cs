using UnrealBuildTool;
using System.Collections.Generic;

public class DiamondBaseballCareerEditorTarget : TargetRules
{
    public DiamondBaseballCareerEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8;
        ExtraModuleNames.Add("DiamondBaseballCareer");
    }
}