import { Candidate } from '../types';

export const templateService = {
  replacePlaceholders: (
    content: string,
    candidate: Candidate,
    additionalData: { [key: string]: string | undefined } = {}
  ): string => {
    let newContent = content;

    const replacements: { [key: string]: string } = {
        candidateName: candidate.name || '',
        position: candidate.position || '',
        interviewDate: candidate.interviewDate || '[تاریخ مصاحبه تعیین نشده]',
        interviewTime: candidate.interviewTime || '[ساعت مصاحبه تعیین نشده]',
        ...additionalData
    };
    
    // Filter out any undefined values from additionalData
    for(const key in replacements) {
        if (replacements[key] === undefined) {
            delete replacements[key];
        }
    }

    // Replace all placeholders
    newContent = newContent.replace(/{{(\w+)}}/g, (match, key) => {
        return replacements[key] || match;
    });

    return newContent;
  },
  
  hasPlaceholder: (content: string | undefined, placeholder: string): boolean => {
      if (!content) return false;
      return content.includes(`{{${placeholder}}}`);
  }
};
