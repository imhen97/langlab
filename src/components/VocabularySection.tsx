"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Clock,
  Star,
  ExternalLink,
} from "lucide-react";

interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  context: string;
  timestamp: number;
  source: string;
  mastery: number;
  isLearned: boolean;
  createdAt: string;
  lesson: {
    id: string;
    title: string;
    thumbnail: string;
  };
}

interface VocabularySectionProps {
  lessonId: string;
  onSeekTo?: (timestamp: number) => void;
}

export default function VocabularySection({ lessonId, onSeekTo }: VocabularySectionProps) {
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTranslation, setEditTranslation] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    learned: 0,
    unlearned: 0,
  });

  // 오늘의 단어장 로드
  const loadTodayVocabulary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vocabulary/today?lessonId=${lessonId}`);
      const data = await response.json();
      
      if (response.ok) {
        setVocabularyItems(data.items);
        setStats(data.stats);
      } else {
        console.error("단어장 로드 실패:", data.error);
      }
    } catch (error) {
      console.error("단어장 로드 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 단어 학습 완료 토글
  const toggleLearned = async (itemId: string, isLearned: boolean) => {
    try {
      const response = await fetch(`/api/vocabulary/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isLearned: !isLearned }),
      });

      if (response.ok) {
        setVocabularyItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, isLearned: !isLearned } : item
          )
        );
        setStats(prev => ({
          ...prev,
          learned: isLearned ? prev.learned - 1 : prev.learned + 1,
          unlearned: isLearned ? prev.unlearned + 1 : prev.unlearned - 1,
        }));
      }
    } catch (error) {
      console.error("학습 상태 업데이트 오류:", error);
    }
  };

  // 번역 수정
  const updateTranslation = async (itemId: string) => {
    try {
      const response = await fetch(`/api/vocabulary/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ translation: editTranslation }),
      });

      if (response.ok) {
        setVocabularyItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, translation: editTranslation } : item
          )
        );
        setEditingId(null);
        setEditTranslation("");
      }
    } catch (error) {
      console.error("번역 업데이트 오류:", error);
    }
  };

  // 단어 삭제
  const deleteWord = async (itemId: string) => {
    if (!confirm("이 단어를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/vocabulary/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setVocabularyItems(prev => prev.filter(item => item.id !== itemId));
        setStats(prev => ({
          ...prev,
          total: prev.total - 1,
          unlearned: prev.unlearned - 1,
        }));
      }
    } catch (error) {
      console.error("단어 삭제 오류:", error);
    }
  };

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    loadTodayVocabulary();
  }, [lessonId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>오늘의 단어장</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">단어장을 불러오는 중...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>오늘의 단어장</span>
            <Badge variant="secondary">{stats.total}</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTodayVocabulary}
          >
            새로고침
          </Button>
        </div>
        
        {/* 통계 */}
        <div className="flex space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Check className="w-4 h-4 text-green-600" />
            <span>학습완료: {stats.learned}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4 text-orange-600" />
            <span>학습대기: {stats.unlearned}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {vocabularyItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>오늘 추가된 단어가 없습니다.</p>
            <p className="text-sm mt-1">자막의 단어를 클릭해서 단어장에 추가해보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vocabularyItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 border rounded-lg transition-all ${
                  item.isLearned
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-lg">{item.word}</h4>
                      {item.isLearned && (
                        <Badge variant="default" className="bg-green-600">
                          학습완료
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {item.source === "caption" ? "자막" : "수동"}
                      </Badge>
                    </div>
                    
                    {editingId === item.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={editTranslation}
                          onChange={(e) => setEditTranslation(e.target.value)}
                          placeholder="번역을 입력하세요"
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => updateTranslation(item.id)}
                          disabled={!editTranslation.trim()}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditTranslation("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-gray-600 mb-2">
                        {item.translation || (
                          <span className="italic text-gray-400">번역이 없습니다</span>
                        )}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-500 mb-2">
                      <div className="flex items-center space-x-1 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(item.timestamp)}</span>
                        {onSeekTo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-1 h-auto"
                            onClick={() => onSeekTo(item.timestamp)}
                            title="해당 시간으로 이동"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-gray-600 italic">"{item.context}"</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      size="sm"
                      variant={item.isLearned ? "outline" : "default"}
                      onClick={() => toggleLearned(item.id, item.isLearned)}
                      title={item.isLearned ? "학습 취소" : "학습 완료"}
                    >
                      {item.isLearned ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditTranslation(item.translation);
                      }}
                      title="번역 수정"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteWord(item.id)}
                      title="삭제"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


