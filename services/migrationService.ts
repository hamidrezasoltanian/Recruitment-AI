import { Candidate } from '../types';

// A simple semver compare function. Returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal.
const versionCompare = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
        const p1 = isNaN(parts1[i]) ? 0 : parts1[i];
        const p2 = isNaN(parts2[i]) ? 0 : parts2[i];
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
};

// This function ensures a candidate object from an older backup conforms to the current Candidate type.
const migrateTo_1_1_0 = (candidates: any[]): Candidate[] => {
    return candidates.map(c => {
        // Create a new object, ensuring all fields from the current Candidate type exist.
        const migratedCandidate: Candidate = {
            id: c.id,
            name: c.name,
            email: c.email || '',
            phone: c.phone || '',
            stage: c.stage,
            createdAt: c.createdAt || new Date().toISOString(),
            source: c.source || 'نامشخص',
            rating: c.rating || 0,
            position: c.position || 'موقعیت شغلی نامشخص',
            interviewDate: c.interviewDate,
            interviewTime: c.interviewTime,
            interviewTimeChanged: c.interviewTimeChanged || false,
            history: c.history || [{ user: 'سیستم', action: 'مهاجرت داده به نسخه 1.1.0', timestamp: new Date().toISOString() }],
            comments: c.comments || [],
            hasResume: c.hasResume || false,
            testResults: c.testResults || [],
        };
        return migratedCandidate;
    });
};

export const migrationService = {
  migrate: (candidates: any[], fromVersion: string): Candidate[] => {
    let migratedData = [...candidates];
    
    // Apply migrations sequentially based on the backup's version.
    if (versionCompare(fromVersion, '1.1.0') < 0) {
        migratedData = migrateTo_1_1_0(migratedData);
    }
    
    // Future migrations would be added here, e.g.:
    // if (versionCompare(fromVersion, '1.2.0') < 0) {
    //     migratedData = migrateTo_1_2_0(migratedData);
    // }

    return migratedData;
  }
};
